from fastapi import APIRouter, Query

from services.sensors import get_sensor_snapshot

router = APIRouter()


@router.get("/")
async def get_sensors(refresh: bool = Query(False)):
    """Unified feed: deployed South India sensor network + live USGS and
    Open-Meteo signals."""
    return await get_sensor_snapshot(refresh=refresh)


@router.get("/live")
async def get_live_sensors(refresh: bool = Query(False)):
    return await get_sensor_snapshot(refresh=refresh)


@router.get("/risk")
async def get_live_risk(refresh: bool = Query(False)):
    """Live composite risk level (0-100) derived from seismic and rainfall signals."""
    snapshot = await get_sensor_snapshot(refresh=refresh)
    return {
        "live_risk_level": snapshot["live_risk_level"],
        "status": snapshot["status"],
        "updated_at": snapshot["updated_at"],
    }
