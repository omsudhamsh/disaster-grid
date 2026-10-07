from fastapi import APIRouter, Query

from services import safety

router = APIRouter()


@router.get("/nearby")
async def get_nearby(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10.0, gt=0, le=100),
):
    """Accurate great-circle safety check around the user's GPS position.

    Returns the safety verdict plus every live incident inside the radius
    (default 10 km) and the nearest threat of any distance for context.
    """
    label = await safety.reverse_geocode(lat, lon)
    assessment = await safety.assess_location(lat, lon, radius_km)
    assessment["location_label"] = label
    return assessment
