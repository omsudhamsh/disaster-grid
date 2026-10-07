import json
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import nlp
from services.geo import is_inside_india
from services.live_incidents import (
    create_user_report,
    get_aggregated_incidents,
)

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
async def get_incidents():
    """Live incident registry: NASA EONET + USGS + ReliefWeb feeds merged
    with citizen reports. Static/random sample data is no longer served."""
    incidents, sources, updated_at = await get_aggregated_incidents()
    return {
        "count": len(incidents),
        "incidents": incidents,
        "live_sources": sources,
        "generated_at": updated_at,
    }


@router.post("/", status_code=201)
def report_incident(payload: IncidentReport):
    """Report a new live incident; persisted to the incident registry."""
    if not is_inside_india(payload.latitude, payload.longitude):
        raise HTTPException(
            status_code=422,
            detail="Incident reports are restricted to locations inside India",
        )

    urgency = payload.urgency
    if urgency not in _URGENCY_PRIORITY:
        urgency = "Moderate"

    incident = create_user_report({
        "location": payload.location,
        "state": payload.state or nlp.analyze_message(payload.location).get("state"),
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "type": payload.type,
        "priority": _URGENCY_PRIORITY[urgency],
        "people": payload.people,
        "aid": payload.aid,
        "source": payload.source,
    })

    return {"created": True, "incident": incident}


@router.get("/{incident_id}")
async def get_incident(incident_id: str):
    incidents, _, _ = await get_aggregated_incidents()
    for incident in incidents:
        if incident.get("id") == incident_id:
            return incident
    raise HTTPException(status_code=404, detail="Incident not found")
