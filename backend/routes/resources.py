from fastapi import APIRouter

from services.live_incidents import get_aggregated_incidents

router = APIRouter()

# National logistics inventory across PAN India.
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
        "location": "New Delhi, Delhi",
        "available": 6,
        "total": 12,
        "status": "Available",
    },
    {
        "id": "RES-03",
        "type": "Survey Drones",
        "location": "Bengaluru, Karnataka",
        "available": 5,
        "total": 8,
        "status": "Available",
    },
    {
        "id": "RES-04",
        "type": "NDRF Squads",
        "location": "Vijayawada, Andhra Pradesh",
        "available": 3,
        "total": 6,
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
        "location": "Guwahati, Assam",
        "available": 14,
        "total": 20,
        "status": "Available",
    },
    {
        "id": "RES-07",
        "type": "Medical Teams",
        "location": "Kolkata, West Bengal",
        "available": 4,
        "total": 7,
        "status": "Available",
    },
    {
        "id": "RES-08",
        "type": "Relief Camps",
        "location": "Lucknow, Uttar Pradesh",
        "available": 7,
        "total": 10,
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
async def get_resources():
    """Resource inventory plus dynamic allocation per active incident."""
    incidents, _, _ = await get_aggregated_incidents()

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
