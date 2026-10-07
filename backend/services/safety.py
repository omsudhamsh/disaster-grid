"""Location safety service: user position vs. the live incident grid.

Answers "am I safe right now?" for the signed-in user's real GPS position
with an accurate great-circle radius check (default 10 km), including the
nearest threat distance, direction, and a professional safety verdict.
"""

import math

import httpx

from services.geo import bearing_cardinal, haversine_km, is_inside_india
from services.live_incidents import get_aggregated_incidents

DEFAULT_RADIUS_KM = 10.0
MAX_RADIUS_KM = 100.0

NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"

_SAFE_STANDING = ("ok",)


def _classify(distance_km):
    if distance_km <= 2.0:
        return "danger", "You are inside an active crisis zone"
    if distance_km <= 5.0:
        return "caution", "You are close to an active crisis zone"
    return "safe", "You are safe from reported crisis zones"


async def reverse_geocode(latitude, longitude):
    """Best-effort human-readable place label for the GPS fix."""
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            response = await client.get(
                NOMINATIM_REVERSE,
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "format": "jsonv2",
                    "zoom": 14,
                },
                headers={"User-Agent": "DisasterGrid/1.0 (safety-check)"},
            )
            if response.is_success:
                data = response.json()
                address = data.get("address", {})
                city = (
                    address.get("city")
                    or address.get("town")
                    or address.get("village")
                    or address.get("suburb")
                    or address.get("county")
                )
                state = address.get("state")
                if city and state:
                    return f"{city}, {state}"
                return data.get("display_name", "")[:120] or None
    except httpx.HTTPError:
        pass
    return None


def _threat_level(incident):
    return {
        "Critical": 4,
        "High": 3,
        "Moderate": 2,
        "Low": 1,
    }.get(incident.get("urgency"), 2)


async def assess_location(latitude, longitude, radius_km=DEFAULT_RADIUS_KM):
    """Full safety assessment for a verified GPS position."""
    radius_km = min(float(radius_km or DEFAULT_RADIUS_KM), MAX_RADIUS_KM)

    inside_india = is_inside_india(latitude, longitude)
    incidents, sources, updated_at = await get_aggregated_incidents()

    within = []
    for incident in incidents:
        lat, lng = incident.get("latitude"), incident.get("longitude")
        if lat is None or lng is None:
            continue
        distance = haversine_km(latitude, longitude, lat, lng)
        if distance is not None and distance <= radius_km:
            within.append((distance, incident))

    within.sort(key=lambda pair: pair[0])

    # Nearest threat of any kind, even beyond the radius, for context.
    nearest = None
    for incident in incidents:
        lat, lng = incident.get("latitude"), incident.get("longitude")
        if lat is None or lng is None:
            continue
        distance = haversine_km(latitude, longitude, lat, lng)
        if distance is None:
            continue
        if nearest is None or distance < nearest["distance_km"]:
            nearest = {
                "incident_id": incident.get("id"),
                "location": incident.get("location"),
                "type": incident.get("type"),
                "urgency": incident.get("urgency"),
                "distance_km": round(distance, 2),
                "bearing": bearing_cardinal(latitude, longitude, lat, lng),
            }

    people_in_radius = sum(
        int(incident.get("people") or 0) for _, incident in within
    )

    if within:
        nearest_within_distance, nearest_within = within[0]
        verdict, headline = _classify(nearest_within_distance)
    else:
        nearest_within_distance, nearest_within = None, None
        verdict, headline = "safe", "You are safe from reported crisis zones"

    if not inside_india:
        verdict, headline = "outside", "Location outside the Indian operations grid"

    return {
        "assessed_at": updated_at,
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "radius_km": radius_km,
        "inside_india": inside_india,
        "verdict": verdict,
        "headline": headline,
        "incidents_in_radius": len(within),
        "people_in_radius": people_in_radius,
        "nearest_in_radius": (
            {
                "incident_id": nearest_within.get("id"),
                "location": nearest_within.get("location"),
                "state": nearest_within.get("state"),
                "type": nearest_within.get("type"),
                "urgency": nearest_within.get("urgency"),
                "priority": nearest_within.get("priority"),
                "distance_km": round(nearest_within_distance, 2),
                "bearing": bearing_cardinal(
                    latitude, longitude, nearest_within["latitude"], nearest_within["longitude"]
                ),
            }
            if nearest_within
            else None
        ),
        "nearest_any": nearest,
        "incidents": [
            {
                "id": incident.get("id"),
                "location": incident.get("location"),
                "type": incident.get("type"),
                "urgency": incident.get("urgency"),
                "distance_km": round(distance, 2),
            }
            for distance, incident in within[:10]
        ],
        "live_sources": sources,
    }
