import json
from pathlib import Path

from fastapi import APIRouter, HTTPException


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
def get_incidents():
    incidents = load_incidents()

    return {
        "count": len(incidents),
        "incidents": incidents,
    }


@router.get("/{incident_id}")
def get_incident(incident_id: str):

    incidents = load_incidents()

    for incident in incidents:
        if incident.get("id") == incident_id:
            return incident

    raise HTTPException(
        status_code=404,
        detail="Incident not found",
    )