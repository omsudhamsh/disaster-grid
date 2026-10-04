import json
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import nlp

router = APIRouter()

DATA_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "incidents.json"
)

_write_lock = threading.Lock()

_URGENCY_PRIORITY = {
    "Critical": 90,
    "High": 75,
    "Moderate": 55,
    "Low": 35,
}


def load_incidents():
    if not DATA_FILE.exists():
        return []
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def _save_incidents(incidents):
    with DATA_FILE.open("w", encoding="utf-8") as file:
        json.dump(incidents, file, indent=2, ensure_ascii=False)


def _next_id(incidents):
    highest = 0
    for incident in incidents:
        raw = str(incident.get("id", ""))
        if raw.startswith("INC-"):
            digits = raw.split("-", 1)[1]
            if digits.isdigit():
                highest = max(highest, int(digits))
    return f"INC-{highest + 1:03d}"


class IncidentReport(BaseModel):
    location: str = Field(min_length=2, max_length=120)
    state: str | None = Field(default=None, max_length=60)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    type: str = Field(default="General Emergency", max_length=60)
    people: int = Field(default=0, ge=0, le=100000)
    urgency: str = Field(default="Moderate", max_length=20)
    aid: str = Field(default="General Assistance", max_length=120)
    source: str = Field(default="Field Report", max_length=60)


@router.get("/")
def get_incidents():
    incidents = load_incidents()
    return {
        "count": len(incidents),
        "incidents": incidents,
    }


@router.post("/", status_code=201)
def report_incident(payload: IncidentReport):
    """Report a new live incident; persisted to the incident registry."""
    urgency = payload.urgency
    if urgency not in _URGENCY_PRIORITY:
        urgency = "Moderate"

    with _write_lock:
        incidents = load_incidents()
        incident = {
            "id": _next_id(incidents),
            "location": payload.location.strip(),
            "state": payload.state or nlp.analyze_message(payload.location).get("state"),
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "type": payload.type,
            "priority": _URGENCY_PRIORITY[urgency],
            "people": payload.people,
            "urgency": urgency,
            "aid": payload.aid,
            "source": payload.source,
            "time": "just now",
        }
        incidents.insert(0, incident)
        _save_incidents(incidents)

    return {"created": True, "incident": incident}


@router.get("/{incident_id}")
def get_incident(incident_id: str):
    incidents = load_incidents()
    for incident in incidents:
        if incident.get("id") == incident_id:
            return incident
    raise HTTPException(status_code=404, detail="Incident not found")
