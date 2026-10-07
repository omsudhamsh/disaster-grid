"""Live incident registry — replaces static/random disaster data.

Aggregates verified live feeds into one operational incident stream:

    * NASA EONET            natural events (India-filtered)
    * USGS earthquake feed  seismic events (India region)
    * ReliefWeb             official UN OCHA disaster records (India)
    * user reports          POSTed through the platform (persisted)

Events are deduplicated across sources (same disaster type within 25 km
counts as one incident with corroborating sources), so the map never shows
overlapping duplicates of the same real-world event.
"""

import asyncio
import json
import threading
import time
from pathlib import Path

import httpx

from services import nasa
from services.geo import haversine_km, is_inside_india

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
REPORTS_FILE = DATA_DIR / "incidents.json"

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"

MERGE_RADIUS_KM = 25
CACHE_TTL_SECONDS = 300

_write_lock = threading.Lock()
_cache = {"timestamp": 0.0, "incidents": [], "sources": {}}


def load_user_reports():
    if not REPORTS_FILE.exists():
        return []
    try:
        with REPORTS_FILE.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return []


def save_user_report(incident):
    with _write_lock:
        reports = load_user_reports()
        reports.insert(0, incident)
        with REPORTS_FILE.open("w", encoding="utf-8") as file:
            json.dump(reports, file, indent=2, ensure_ascii=False)


def _next_report_id(reports):
    highest = 0
    for incident in reports:
        raw = str(incident.get("id", ""))
        if raw.startswith("INC-") and raw.split("-", 1)[1].isdigit():
            highest = max(highest, int(raw.split("-", 1)[1]))
    return f"INC-{highest + 1:03d}"


def _urgency_label(priority):
    if priority >= 85:
        return "Critical"
    if priority >= 70:
        return "High"
    if priority >= 50:
        return "Moderate"
    return "Low"


def _aid_for(disaster_type):
    return {
        "Flood": "Rescue + Food + Water",
        "Cyclone": "Evacuation + Rescue",
        "Wildfire": "Evacuation + Medical",
        "Earthquake": "Rescue + Medical",
        "Landslide": "Rescue + Medical",
        "Drought": "Food + Water",
    }.get(disaster_type, "General Assistance")


async def _fetch_earthquakes():
    """USGS seismic events across the Indian region (min magnitude 4)."""
    params = {
        "format": "geojson",
        "minmagnitude": 4.0,
        "starttime": "2025-10-01",
        "minlatitude": 5.0,
        "maxlatitude": 37.5,
        "minlongitude": 66.0,
        "maxlongitude": 98.5,
        "orderby": "time",
        "limit": 60,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(USGS_URL, params=params)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return []

    incidents = []
    for feature in payload.get("features", []):
        properties = feature.get("properties", {})
        coordinates = feature.get("geometry", {}).get("coordinates", [])
        if len(coordinates) < 2:
            continue
        longitude, latitude = coordinates[0], coordinates[1]
        if not is_inside_india(latitude, longitude):
            continue
        magnitude = properties.get("mag") or 0
        priority = (
            96 if magnitude >= 6.5
            else 90 if magnitude >= 6.0
            else 80 if magnitude >= 5.0
            else 62
        )
        place = (properties.get("place") or "Regional earthquake").strip()
        incidents.append({
            "id": f"USGS-{feature.get('id', 'QK')}",
            "location": place.split(",")[0].strip()[:80],
            "state": None,
            "latitude": round(float(latitude), 5),
            "longitude": round(float(longitude), 5),
            "type": "Earthquake",
            "priority": priority,
            "people": 0,
            "urgency": _urgency_label(priority),
            "aid": _aid_for("Earthquake"),
            "source": "USGS",
            "time": properties.get("time") and time.strftime(
                "%Y-%m-%dT%H:%M:%SZ", time.gmtime(properties["time"] / 1000)
            ),
            "magnitude": f"M {magnitude}",
            "title": place,
            "source_url": properties.get("url"),
        })
    return incidents


async def _fetch_gdacs():
    """Official GDACS alerts (JRC / European Commission) inside India."""
    from xml.etree import ElementTree

    ns = {
        "georss": "http://www.georss.org/georss",
        "gdacs": "http://www.gdacs.org",
        "dc": "http://purl.org/dc/elements/1.1/",
    }
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            response = await client.get(
                GDACS_RSS_URL,
                headers={"User-Agent": "DisasterGrid/1.0 (emergency-response platform)"},
            )
            response.raise_for_status()
            root = ElementTree.fromstring(response.content)
    except (httpx.HTTPError, ElementTree.ParseError):
        return []

    incidents = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        if "in india" not in title.lower() and "india" not in title.lower():
            continue

        point = item.findtext("georss:point", namespaces=ns)
        if not point:
            continue
        try:
            latitude, longitude = (float(part) for part in point.split()[:2])
        except ValueError:
            continue
        if not is_inside_india(latitude, longitude):
            continue

        description = (item.findtext("description") or "").strip()
        alert = "Green"
        if "orange" in title.lower():
            alert = "Orange"
        elif "red" in title.lower():
            alert = "Red"

        disaster_type = _gdacs_type(title, item)
        if disaster_type is None:
            continue

        priority = {"Red": 92, "Orange": 82, "Green": 66}[alert]
        event_id = item.findtext("guid") or f"GDACS{abs(hash(title)) % 10**6}"
        pub_date = item.findtext("pubDate") or ""
        link = (item.findtext("link") or "").strip()

        incidents.append({
            "id": f"GDACS-{event_id}",
            "location": title.replace("alert in India", "").split("alert")[-1].strip(" in") or "India",
            "state": None,
            "latitude": round(latitude, 5),
            "longitude": round(longitude, 5),
            "type": disaster_type,
            "priority": priority,
            "people": 0,
            "urgency": _urgency_label(priority),
            "aid": _aid_for(disaster_type),
            "source": "GDACS",
            "time": pub_date,
            "title": title,
            "description": description[:300],
            "alert_level": alert,
            "source_url": link,
        })
    return incidents


def _gdacs_type(title, item):
    lower = title.lower()
    subject = (item.findtext("dc:subject", default="", namespaces={"dc": "http://purl.org/dc/elements/1.1/"}) or "").upper()
    if subject.startswith("FL") or "flood" in lower:
        return "Flood"
    if subject.startswith("TC") or "cyclone" in lower or "storm" in lower:
        return "Cyclone"
    if subject.startswith("EQ") or "earthquake" in lower:
        return "Earthquake"
    if subject.startswith("WF") or "wildfire" in lower or "forest fire" in lower:
        return "Wildfire"
    if subject.startswith("VO") or "volcan" in lower:
        return "Volcanic Activity"
    if subject.startswith("DR") or "drought" in lower:
        return "Drought"
    return None


def _merge_duplicates(incidents):
    """Collapse same-type events within MERGE_RADIUS_KM into one incident."""
    merged = []
    for incident in incidents:
        target = None
        if incident.get("latitude") is not None:
            for existing in merged:
                if existing.get("latitude") is None:
                    continue
                if existing["type"] != incident["type"]:
                    continue
                distance = haversine_km(
                    incident["latitude"], incident["longitude"],
                    existing["latitude"], existing["longitude"],
                )
                if distance is not None and distance <= MERGE_RADIUS_KM:
                    target = existing
                    break

        if target is None:
            merged.append(dict(incident))
            continue

        target["corroborating_sources"] = sorted(
            set(target.get("corroborating_sources", [target["source"]]))
            | {incident["source"]}
        )
        if incident["priority"] > target["priority"]:
            # Keep the higher-priority assessment but retain the primary id.
            keep = {k: incident[k] for k in (
                "priority", "urgency", "latitude", "longitude", "time",
                "magnitude", "source_url",
            ) if incident.get(k) is not None}
            target.update(keep)
            target["source"] = incident["source"]
    return merged


async def get_live_incidents(refresh=False):
    """Aggregate live incidents: NASA EONET + USGS + ReliefWeb, deduped."""
    now = time.monotonic()
    if not refresh and _cache["incidents"] and now - _cache["timestamp"] < CACHE_TTL_SECONDS:
        return list(_cache["incidents"]), dict(_cache["sources"]), _cache["updated_at"]

    eonet, earthquakes, gdacs = await asyncio.gather(
        nasa.fetch_eonet_events(),
        _fetch_earthquakes(),
        _fetch_gdacs(),
        return_exceptions=True,
    )

    sources = {}
    collected = []

    if isinstance(eonet, list):
        sources["nasa_eonet"] = {"status": "live", "count": len(eonet)}
        collected.extend(eonet)
    else:
        sources["nasa_eonet"] = {"status": "degraded", "count": 0}

    if isinstance(earthquakes, list):
        sources["usgs"] = {"status": "live", "count": len(earthquakes)}
        collected.extend(earthquakes)
    else:
        sources["usgs"] = {"status": "degraded", "count": 0}

    if isinstance(gdacs, list):
        sources["gdacs"] = {"status": "live", "count": len(gdacs)}
        collected.extend(gdacs)
    else:
        sources["gdacs"] = {"status": "degraded", "count": 0}

    incidents = _merge_duplicates(collected)
    incidents.sort(key=lambda item: item.get("priority", 0), reverse=True)

    _cache.update(
        {
            "timestamp": now,
            "incidents": incidents,
            "sources": sources,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    )
    return list(incidents), dict(sources), _cache["updated_at"]


async def get_aggregated_incidents(refresh=False):
    """Live feeds + citizen reports, in one priority-ranked list."""
    live, sources, updated_at = await get_live_incidents(refresh=refresh)
    reports = load_user_reports()

    combined = [dict(report) for report in reports]
    seen_locations = [
        (report.get("latitude"), report.get("longitude"))
        for report in reports
        if report.get("latitude") is not None
    ]

    for incident in live:
        if incident.get("latitude") is None:
            combined.append(incident)
            continue
        # Skip a live event that a citizen report already covers nearby.
        duplicate = any(
            haversine_km(
                incident["latitude"], incident["longitude"], lat, lng
            ) is not None
            and haversine_km(incident["latitude"], incident["longitude"], lat, lng) <= MERGE_RADIUS_KM
            for lat, lng in seen_locations
        )
        if not duplicate:
            combined.append(incident)

    combined.sort(key=lambda item: item.get("priority", 0), reverse=True)
    return combined, sources, updated_at


def create_user_report(payload):
    """Persist a citizen report and return the stored incident record."""
    reports = load_user_reports()
    incident = {
        "id": _next_report_id(reports),
        "location": payload["location"].strip(),
        "state": payload.get("state"),
        "latitude": payload["latitude"],
        "longitude": payload["longitude"],
        "type": payload.get("type", "General Emergency"),
        "priority": payload.get("priority", 55),
        "people": payload.get("people", 0),
        "urgency": _urgency_label(payload.get("priority", 55)),
        "aid": payload.get("aid", "General Assistance"),
        "source": payload.get("source", "Field Report"),
        "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    save_user_report(incident)
    return incident
