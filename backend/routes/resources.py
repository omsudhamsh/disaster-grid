import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

INCIDENTS_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "incidents.json"
)

# Regional inventory pool across South India.
INVENTORY = [
    {
        "id": "RES-01",
        "type": "Rescue Boats",
        "location": "Chennai, Tamil Nadu",
        "available": 8,
        "total": 14,
        "status": "Available",
    },
    {
        "id": "RES-02",
        "type": "Medical Teams",
        "location": "Hyderabad, Telangana",
        "available": 5,
        "total": 9,
        "status": "Available",
    },
    {
        "id": "RES-03",
        "type": "Survey Drones",
        "location": "Bengaluru, Karnataka",
        "available": 4,
        "total": 6,
        "status": "Available",
    },
    {
        "id": "RES-04",
        "type": "NDRF Squads",
        "location": "Vijayawada, Andhra Pradesh",
        "available": 2,
        "total": 4,
        "status": "Deployed",
    },
    {
        "id": "RES-05",
        "type": "Relief Camps",
        "location": "Kochi, Kerala",
        "available": 6,
        "total": 8,
        "status": "Available",
    },
    {
        "id": "RES-06",
        "type": "Water Supply Units",
        "location": "Coimbatore, Tamil Nadu",
        "available": 12,
        "total": 20,
        "status": "Available",
    },
]


def _allocation_for(incident):
    aid = incident.get("aid", "")
    incident_type = incident.get("type", "")
    units = []

    if "Rescue" in aid or incident_type in ("Flood", "Waterlogging", "Landslide"):
        units.append("2 Rescue Boats")
    if "Medical" in aid:
        units.append("1 Medical Team")
    if "Evacuation" in aid or incident.get("urgency") == "Critical":
        units.append("1 NDRF Squad")
    if incident.get("urgency") in ("Critical", "High"):
        units.append("1 Survey Drone")
    if "Food" in aid or "Water" in aid:
        units.append("2 Supply Convoys")

    return units or ["Assessment Team"]


@router.get("/")
def get_resources():
    """Resource inventory plus dynamic allocation per active incident."""
    try:
        with INCIDENTS_FILE.open("r", encoding="utf-8") as file:
            incidents = json.load(file)
    except (OSError, json.JSONDecodeError):
        incidents = []

    active = sorted(
        incidents,
        key=lambda incident: incident.get("priority", 0),
        reverse=True,
    )

    allocations = [
        {
            "incident_id": incident.get("id"),
            "location": incident.get("location"),
            "state": incident.get("state"),
            "priority": incident.get("priority", 0),
            "people": incident.get("people", 0),
            "needs": incident.get("aid", "General Assistance"),
            "units": _allocation_for(incident),
        }
        for incident in active
        if incident.get("priority", 0) >= 60
    ]

    deployed_units = sum(len(item["units"]) for item in allocations)

    return {
        "inventory": INVENTORY,
        "allocations": allocations,
        "deployed_units": deployed_units,
    }
