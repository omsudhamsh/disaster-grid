"""Unified sensor feed: deployed IoT nodes + live USGS / Open-Meteo data."""

import asyncio
import json
import time
from pathlib import Path

import httpx

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "sensors.json"
USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_SECONDS = 300

# South India reference point
CENTER_LAT = 13.0827
CENTER_LON = 80.2707

_cache = {"timestamp": 0.0, "earthquakes": [], "weather": None}


def _load_static_sensors():
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


async def _fetch_live_feeds():
    earthquake_params = {
        "format": "geojson",
        "minmagnitude": 2.5,
        "latitude": CENTER_LAT,
        "longitude": CENTER_LON,
        "maxradiuskm": 1200,
    }
    weather_params = {
        "latitude": CENTER_LAT,
        "longitude": CENTER_LON,
        "current": "temperature_2m,precipitation,rain,wind_speed_10m,wind_gusts_10m,weather_code",
    }

    async with httpx.AsyncClient(timeout=12) as client:
        earthquake_response, weather_response = await asyncio.gather(
            client.get(USGS_URL, params=earthquake_params),
            client.get(WEATHER_URL, params=weather_params),
            return_exceptions=True,
        )

    earthquakes = []
    if isinstance(earthquake_response, httpx.Response) and earthquake_response.is_success:
        for feature in earthquake_response.json().get("features", []):
            properties = feature.get("properties", {})
            coordinates = feature.get("geometry", {}).get("coordinates", [])
            earthquakes.append({
                "id": feature.get("id"),
                "name": properties.get("place", "Regional earthquake"),
                "magnitude": properties.get("mag"),
                "depth_km": coordinates[2] if len(coordinates) > 2 else None,
                "time": properties.get("time"),
                "latitude": coordinates[1] if len(coordinates) > 1 else None,
                "longitude": coordinates[0] if coordinates else None,
                "source": "USGS",
            })

    weather = None
    if isinstance(weather_response, httpx.Response) and weather_response.is_success:
        weather = weather_response.json().get("current")

    return earthquakes, weather


def compute_live_risk(earthquakes, weather):
    """Derive a 0-100 live sensor risk level from seismic + rainfall signals."""
    score = 0.0
    strongest = None
    for event in earthquakes or []:
        magnitude = event.get("magnitude")
        if isinstance(magnitude, (int, float)) and magnitude >= 2.5:
            strongest = max(strongest or 0.0, float(magnitude))
    if strongest:
        score += min((strongest - 2.5) * 15, 40)

    current = weather or {}
    precipitation = float(current.get("precipitation") or 0)
    rain = float(current.get("rain") or 0)
    score += min((precipitation + rain) * 4, 35)

    wind = float(current.get("wind_gusts_10m") or current.get("wind_speed_10m") or 0)
    score += min(wind / 3, 25)

    return round(min(score, 100))


async def get_sensor_snapshot(refresh=False):
    """Return the unified feed: deployed nodes + live earthquakes + weather."""
    now = time.monotonic()
    if refresh or now - _cache["timestamp"] >= CACHE_TTL_SECONDS:
        try:
            earthquakes, weather = await _fetch_live_feeds()
            _cache.update(
                {"timestamp": now, "earthquakes": earthquakes, "weather": weather}
            )
            feed_status = "live"
        except (httpx.HTTPError, ValueError):
            feed_status = "degraded"
    else:
        feed_status = "cached"

    static_sensors = _load_static_sensors()
    risk_level = compute_live_risk(_cache["earthquakes"], _cache["weather"])

    return {
        "status": feed_status,
        "updated_at": time.time(),
        "cache_ttl_seconds": CACHE_TTL_SECONDS,
        "center": {"latitude": CENTER_LAT, "longitude": CENTER_LON},
        "live_risk_level": risk_level,
        "sensors": static_sensors,
        "live": {
            "earthquakes": _cache["earthquakes"],
            "weather": _cache["weather"],
        },
    }
