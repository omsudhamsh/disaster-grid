"""Rescue dispatch pipeline.

Citizen SOS requests are turned into structured dispatch tickets routed to
the nearest national response units (NDRF/SDRF-style staging points). No
third-party messaging platform is required: tickets persist in the
operations datastore, surface live on the command-center alert channel,
and optionally fan out to a generic webhook (Slack / Discord / n8n /
internal CAD) when RESCUE_WEBHOOK_URL is configured.
"""

import json
import threading
import time
from pathlib import Path

import httpx

from services.geo import haversine_km

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "dispatches.json"

_write_lock = threading.Lock()

SPEED_KMH = 45  # planning speed for response convoys


# National response staging points (response capacity mirrored from the
# Resources inventory). Coordinates allow accurate nearest-unit routing.
RESPONSE_UNITS = [
    {"id": "UNIT-01", "name": "Chennai Rescue Column", "type": "Rescue Boats + Medical", "base": "Chennai, Tamil Nadu", "latitude": 13.0827, "longitude": 80.2707},
    {"id": "UNIT-02", "name": "Delhi NCR Quick Response", "type": "Medical Teams", "base": "New Delhi, Delhi", "latitude": 28.6139, "longitude": 77.2090},
    {"id": "UNIT-03", "name": "Bengaluru Drone Recon Wing", "type": "Survey Drones", "base": "Bengaluru, Karnataka", "latitude": 12.9716, "longitude": 77.5946},
    {"id": "UNIT-04", "name": "Vijayawada NDRF Battalion", "type": "NDRF Squad", "base": "Vijayawada, Andhra Pradesh", "latitude": 16.5062, "longitude": 80.6480},
    {"id": "UNIT-05", "name": "Kochi Relief Task Force", "type": "Relief Camps", "base": "Kochi, Kerala", "latitude": 9.9312, "longitude": 76.2673},
    {"id": "UNIT-06", "name": "Guwahati Water Relief Unit", "type": "Water Supply Units", "base": "Guwahati, Assam", "latitude": 26.1445, "longitude": 91.7362},
    {"id": "UNIT-07", "name": "Kolkata Medical Column", "type": "Medical Teams", "base": "Kolkata, West Bengal", "latitude": 22.5726, "longitude": 88.3639},
    {"id": "UNIT-08", "name": "Lucknow Relief Group", "type": "Relief Camps", "base": "Lucknow, Uttar Pradesh", "latitude": 26.8467, "longitude": 80.9462},
    {"id": "UNIT-09", "name": "Hyderabad Response Wing", "type": "Rescue + Medical", "base": "Hyderabad, Telangana", "latitude": 17.3850, "longitude": 78.4867},
    {"id": "UNIT-10", "name": "Mumbai Coast Guard Cell", "type": "Rescue Boats", "base": "Mumbai, Maharashtra", "latitude": 19.0760, "longitude": 72.8777},
    {"id": "UNIT-11", "name": "Ahmedabad Field Hospital", "type": "Medical Teams", "base": "Ahmedabad, Gujarat", "latitude": 23.0225, "longitude": 72.5714},
    {"id": "UNIT-12", "name": "Bhubaneswar Cyclone Cell", "type": "NDRF Squad + Relief", "base": "Bhubaneswar, Odisha", "latitude": 20.2961, "longitude": 85.8245},
]


def load_dispatches():
    if not DATA_FILE.exists():
        return []
    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError):
        return []


def _save_dispatches(dispatches):
    with DATA_FILE.open("w", encoding="utf-8") as file:
        json.dump(dispatches, file, indent=2, ensure_ascii=False)


def _next_id(dispatches):
    highest = 0
    for dispatch in dispatches:
        raw = str(dispatch.get("id", ""))
        if raw.startswith("DSP-") and raw.split("-", 1)[1].isdigit():
            highest = max(highest, int(raw.split("-", 1)[1]))
    return f"DSP-{highest + 1:03d}"


def route_units(latitude, longitude, needs, top=3):
    """Nearest response units with planning ETA for the requested aid."""
    scored = []
    for unit in RESPONSE_UNITS:
        distance = haversine_km(latitude, longitude, unit["latitude"], unit["longitude"])
        if distance is None:
            continue
        scored.append((distance, unit))
    scored.sort(key=lambda item: item[0])

    routed = []
    for distance, unit in scored[:top]:
        relevant = any(
            need.lower() in unit["type"].lower()
            or need.lower() in ("rescue", "medical", "evacuation", "food", "water")
            for need in needs
        )
        routed.append({
            "unit_id": unit["id"],
            "unit": unit["name"],
            "base": unit["base"],
            "capability": unit["type"],
            "distance_km": round(distance, 1),
            "eta_minutes": int(distance / SPEED_KMH * 60) + 10,
            "matched_capability": relevant,
        })
    return routed


def _relay_text(dispatch):
    """Channel-agnostic SOS relay text for manual forwarding if needed."""
    needs = ", ".join(dispatch["needs"])
    return (
        f"SOS DISPATCH {dispatch['id']} | Priority {dispatch['priority']}/100 "
        f"({dispatch['urgency'].upper()}) | {dispatch['disaster_type']} at "
        f"{dispatch['location_label']} | GPS {dispatch['latitude']:.5f},{dispatch['longitude']:.5f} "
        f"| People affected: {dispatch['people']} | Needs: {needs} "
        f"| Nearest unit: {dispatch['assigned_units'][0]['unit']} "
        f"({dispatch['assigned_units'][0]['distance_km']} km, ETA "
        f"{dispatch['assigned_units'][0]['eta_minutes']} min) | Reported by "
        f"{dispatch['reporter']}"
    )


async def _fan_out_webhook(dispatch):
    """Optional relay to an external CAD/webhook endpoint (best effort)."""
    import os

    webhook_url = os.getenv("RESCUE_WEBHOOK_URL")
    if not webhook_url:
        return "unconfigured"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            await client.post(
                webhook_url,
                json={
                    "text": _relay_text(dispatch),
                    "event": "rescue.dispatch",
                    "dispatch": dispatch,
                },
            )
        return "delivered"
    except httpx.HTTPError:
        return "failed"


async def create_dispatch(payload):
    dispatches = load_dispatches()
    needs = payload.get("needs") or ["General Assistance"]

    assigned = route_units(payload["latitude"], payload["longitude"], needs)
    dispatch = {
        "id": _next_id(dispatches),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "status": "dispatched",
        "latitude": payload["latitude"],
        "longitude": payload["longitude"],
        "location_label": payload.get("location_label") or "Recorded GPS position",
        "disaster_type": payload.get("disaster_type", "General Emergency"),
        "urgency": payload.get("urgency", "High"),
        "priority": payload.get("priority", 80),
        "people": payload.get("people", 0),
        "needs": needs,
        "notes": (payload.get("notes") or "")[:500],
        "reporter": payload.get("reporter", "Signed-in responder"),
        "incident_id": payload.get("incident_id"),
        "assigned_units": assigned,
    }

    with _write_lock:
        dispatches = load_dispatches()
        dispatches.insert(0, dispatch)
        with DATA_FILE.open("w", encoding="utf-8") as file:
            json.dump(dispatches, file, indent=2, ensure_ascii=False)

    dispatch["relay_text"] = _relay_text(dispatch)
    dispatch["webhook_status"] = await _fan_out_webhook(dispatch)
    return dispatch


def resolve_dispatch(dispatch_id):
    dispatches = load_dispatches()
    for dispatch in dispatches:
        if dispatch.get("id") == dispatch_id:
            dispatch["status"] = "resolved"
            dispatch["resolved_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            _save_dispatches(dispatches)
            return dispatch
    return None
