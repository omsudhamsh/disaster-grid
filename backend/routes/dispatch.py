from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import dispatch as dispatch_service
from services.geo import is_inside_india

router = APIRouter()


class DispatchRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_label: str | None = Field(default=None, max_length=160)
    disaster_type: str = Field(default="General Emergency", max_length=60)
    urgency: str = Field(default="High", max_length=20)
    priority: int = Field(default=80, ge=0, le=100)
    people: int = Field(default=0, ge=0, le=1000000)
    needs: list[str] = Field(default_factory=lambda: ["Rescue"])
    notes: str | None = Field(default=None, max_length=500)
    reporter: str | None = Field(default=None, max_length=120)
    incident_id: str | None = Field(default=None, max_length=40)


@router.get("/")
def list_dispatches(active_only: bool = False):
    """Dispatch tickets for the command-center alert channel."""
    dispatches = dispatch_service.load_dispatches()
    if active_only:
        dispatches = [d for d in dispatches if d.get("status") == "dispatched"]
    return {
        "count": len(dispatches),
        "dispatches": dispatches,
    }


@router.post("/", status_code=201)
async def create_dispatch(payload: DispatchRequest):
    """Send a rescue request from a citizen/responder to the response grid."""
    if not is_inside_india(payload.latitude, payload.longitude):
        raise HTTPException(
            status_code=422,
            detail="Dispatch requests are restricted to locations inside India",
        )

    dispatch = await dispatch_service.create_dispatch(payload.model_dump())
    return {"created": True, "dispatch": dispatch}


@router.post("/{dispatch_id}/resolve")
def resolve_dispatch(dispatch_id: str):
    dispatch = dispatch_service.resolve_dispatch(dispatch_id)
    if dispatch is None:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return {"resolved": True, "dispatch": dispatch}
