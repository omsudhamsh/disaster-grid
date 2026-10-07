"""NASA open-data service for live disaster feeds and satellite imagery.

Data sources
------------
* EONET v3  (eonet.gsfc.nasa.gov)   natural-event tracker, key optional
* GIBS WMTS (gibs.earthdata.nasa.gov) daily true-colour satellite tiles
* Landsat   (api.nasa.gov)          planetary earth imagery (key required)

Every location-bearing result passes through ``geo.is_inside_india`` so the
platform monitors Indian territory only — neighbouring countries are
filtered out before any event reaches the operational grid.

Caching keeps the feed non-lagging: short TTLs, request timeouts and
idempotent deduplication (no over-lapping / duplicated events across
sources).
"""

import math
import time
from datetime import datetime, timedelta, timezone

import httpx

from services.geo import is_inside_india

NASA_API_KEY = "GYcxoL2hG8E0cAS6yYg2lcHYwpWdtMhhkF02t5U9"

EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"
LANDSAT_URL = "https://api.nasa.gov/planetary/earth/imagery"
GIBS_WMTS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{date}/GoogleMapsCompatible_Level{level}/{z}/{y}/{x}.jpg"

GIBS_TRUE_COLOR = "VIIRS_SNPP_CorrectedReflectance_TrueColor"
GIBS_TRUE_COLOR_LEVEL = 9  # max zoom supported by this layer

REQUEST_TIMEOUT = 15
CACHE_TTL_SECONDS = 300

# EONET category id -> platform disaster type.
CATEGORY_MAP = {
    "wildfires": "Wildfire",
    "severeStorms": "Cyclone",
    "floods": "Flood",
    "earthquakes": "Earthquake",
    "volcanoes": "Volcanic Activity",
    "drought": "Drought",
    "landslides": "Landslide",
    "seaLakeIce": "General Emergency",
    "dustHaze": "Dust Storm",
}

_cache = {"timestamp": 0.0, "events": []}


def _latest_gibs_date():
    """GIBS true-colour mosaics publish with about a one-day lag."""
    return (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")


def gibs_tile_url(latitude, longitude, zoom, date=None):
    """Single GIBS true-colour tile covering the given point."""
    zoom = max(0, min(int(zoom), GIBS_TRUE_COLOR_LEVEL))
    n = 2**zoom
    x = int((float(longitude) + 180.0) / 360.0 * n)
    lat_rad = math.radians(float(latitude))
    y = int((1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2 * n)
    x = min(max(x, 0), n - 1)
    y = min(max(y, 0), n - 1)
    url = GIBS_WMTS.format(
        layer=GIBS_TRUE_COLOR,
        date=date or _latest_gibs_date(),
        level=GIBS_TRUE_COLOR_LEVEL,
        z=zoom,
        y=y,
        x=x,
    )
    tile_km = 40075.016 * math.cos(lat_rad) / n
    return {
        "url": url,
        "tile": {"z": zoom, "x": x, "y": y},
        "coverage_km": round(tile_km, 1),
        "resolution_m": round(tile_km * 1000 / 256, 1),
    }


def _event_coordinates(geometry):
    """Extract (longitude, latitude) from an EONET geometry object."""
    coordinates = geometry.get("coordinates")
    gtype = geometry.get("type")
    if not coordinates:
        return None
    if gtype == "Point":
        return coordinates[0], coordinates[1]
    if gtype in ("Polygon", "MultiPolygon"):
        # Use the first ring's centroid as the event anchor.
        ring = coordinates[0] if gtype == "Polygon" else coordinates[0][0]
        if not ring:
            return None
        lngs = [point[0] for point in ring]
        lats = [point[1] for point in ring]
        return sum(lngs) / len(lngs), sum(lats) / len(lats)
    return None


def _event_priority(category, magnitude_value, magnitude_unit):
    """Operational priority 0-100 for an EONET event."""
    if category == "earthquakes":
        mag = float(magnitude_value or 0)
        if mag >= 6.5:
            return 96
        if mag >= 6.0:
            return 90
        if mag >= 5.0:
            return 80
        return 62
    if category == "severeStorms":
        kts = float(magnitude_value or 0) if (magnitude_unit or "").lower() in ("kts", "knots") else 0
        if kts >= 96:
            return 96
        if kts >= 64:
            return 88
        return 78
    if category == "wildfires":
        acres = float(magnitude_value or 0) if (magnitude_unit or "").lower() == "acres" else 0
        if acres >= 10000:
            return 88
        if acres >= 1000:
            return 74
        return 62
    if category == "floods":
        return 76
    if category in ("volcanoes", "dustHaze"):
        return 58
    return 52


def _aid_for(disaster_type):
    return {
        "Flood": "Rescue + Food + Water",
        "Cyclone": "Evacuation + Rescue",
        "Wildfire": "Evacuation + Medical",
        "Earthquake": "Rescue + Medical",
        "Landslide": "Rescue + Medical",
        "Drought": "Food + Water",
        "Dust Storm": "Medical",
    }.get(disaster_type, "General Assistance")


def _urgency_label(priority):
    if priority >= 85:
        return "Critical"
    if priority >= 70:
        return "High"
    if priority >= 50:
        return "Moderate"
    return "Low"


def _normalise_event(event):
    """EONET event -> platform incident record (India-only enforced)."""
    category_id = next(
        (cat.get("id") for cat in event.get("categories", []) if cat.get("id")),
        None,
    )
    disaster_type = CATEGORY_MAP.get(category_id, "General Emergency")

    latest_geometry = None
    latest_date = None
    for geometry in event.get("geometry", []):
        if geometry.get("date") and (latest_date is None or geometry["date"] > latest_date):
            latest_date = geometry["date"]
            latest_geometry = geometry

    if latest_geometry is None:
        return None

    coords = _event_coordinates(latest_geometry)
    if coords is None:
        return None

    longitude, latitude = coords
    if not is_inside_india(latitude, longitude):
        return None

    magnitude_value = latest_geometry.get("magnitudeValue")
    magnitude_unit = latest_geometry.get("magnitudeUnit")
    priority = _event_priority(category_id, magnitude_value, magnitude_unit)

    title = (event.get("title") or "Natural event").strip()
    # EONET titles often lead with the place name.
    location_name = title.split(",")[0].strip()[:80]

    return {
        "id": f"NASA-{event.get('id', 'EVT')}",
        "location": location_name,
        "state": None,
        "latitude": round(float(latitude), 5),
        "longitude": round(float(longitude), 5),
        "type": disaster_type,
        "priority": priority,
        "people": 0,
        "urgency": _urgency_label(priority),
        "aid": _aid_for(disaster_type),
        "source": "NASA EONET",
        "time": latest_date,
        "event_date": latest_date,
        "title": title,
        "magnitude": (
            f"{magnitude_value} {magnitude_unit}"
            if magnitude_value is not None
            else None
        ),
        "link": event.get("link"),
        "source_url": next(
            (src.get("url") for src in event.get("sources", []) if src.get("url")),
            event.get("link"),
        ),
    }


async def fetch_eonet_events(force=False):
    """Live NASA EONET events restricted to Indian territory."""
    now = time.monotonic()
    if not force and _cache["events"] and now - _cache["timestamp"] < CACHE_TTL_SECONDS:
        return list(_cache["events"])

    params = {
        "status": "open",
        "limit": 300,
        "days": 20,
        "api_key": NASA_API_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(EONET_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        # Keep the last good snapshot so the grid never lags to empty.
        return list(_cache["events"])

    seen_ids = set()
    incidents = []
    for event in payload.get("events", []):
        event_id = event.get("id")
        if event_id in seen_ids:
            continue
        seen_ids.add(event_id)
        incident = _normalise_event(event)
        if incident:
            incidents.append(incident)

    _cache["timestamp"] = now
    _cache["events"] = incidents
    return list(incidents)


async def fetch_landsat_imagery(latitude, longitude, date, dim=0.15):
    """Landsat 8 capture via api.nasa.gov (key-authenticated).

    Returns (image_bytes, content_type, provider) or (None, None, reason).
    This endpoint is slow upstream, so callers must apply a fallback.
    """
    params = {
        "lat": latitude,
        "lon": longitude,
        "date": date,
        "dim": dim,
        "api_key": NASA_API_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=45, follow_redirects=True) as client:
            response = await client.get(LANDSAT_URL, params=params)
            if response.is_success and response.content:
                content_type = response.headers.get("content-type", "image/jpeg")
                if content_type.startswith("image/"):
                    return response.content, content_type, "nasa-landsat"
    except httpx.HTTPError:
        pass
    return None, None, "landsat-unavailable"


async def fetch_gibs_tile(latitude, longitude, zoom, date=None):
    """True-colour satellite capture from NASA GIBS for a point."""
    tile = gibs_tile_url(latitude, longitude, zoom, date)
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.get(tile["url"])
            if response.is_success and response.content:
                return (
                    response.content,
                    response.headers.get("content-type", "image/jpeg"),
                    "nasa-gibs-viirs",
                    tile,
                )
    except httpx.HTTPError:
        pass
    return None, None, "gibs-unavailable", tile
