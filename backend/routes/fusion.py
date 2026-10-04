import json
from pathlib import Path

from fastapi import APIRouter
from services.fusion import build_fusion

router = APIRouter()

DATA_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "incidents.json"
)


def load_incidents():
    if not DATA_FILE.exists():
        return []

    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


@router.get("/")
def get_fusion_data():

    incidents = load_incidents()

    if not incidents:
        return {
            "status": "no_data",
            "message": "No incident data available",
            "fusion": None,
        }

    # Highest priority incident
    highest = max(
        incidents,
        key=lambda incident: incident.get("priority", 0)
    )

    priority = highest.get("priority", 0)
    people = highest.get("people", 0)

    # Confidence based on multiple available sources
    source_count = len(
        set(
            incident.get("source")
            for incident in incidents
            if incident.get("source")
        )
    )

    confidence = min(70 + source_count * 5, 95)

    aid = highest.get("aid", "General Assistance")

    if "Rescue" in aid and "Medical" in aid:
        recommendation = "Immediate Rescue + Medical Response"
    elif "Rescue" in aid:
        recommendation = "Immediate Rescue Response"
    elif "Medical" in aid:
        recommendation = "Medical Response"
    elif "Evacuation" in aid:
        recommendation = "Evacuation Support"
    else:
        recommendation = f"{aid} Response"

    return {
        "status": "success",
        "fusion": {
            **build_fusion(highest),
            "people_affected": people,
            "priority": build_fusion(highest)["priority"],
            "confidence": confidence,
            "source_count": source_count,
            "sources": [
                {
                    "name": "Crisis Reports",
                    "type": highest.get("source"),
                    "signal": f"{people} people affected",
                },
                {
                    "name": "Incident Intelligence",
                    "type": highest.get("type"),
                    "signal": f"Priority score {priority}",
                },
            ],
            "required_aid": aid,
            "recommendation": recommendation,
        },
    }