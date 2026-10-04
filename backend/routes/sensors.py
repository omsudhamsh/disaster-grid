from fastapi import APIRouter, Query

from services.sensors import get_sensor_snapshot

router = APIRouter()


@router.get("/")
async def get_sensors(refresh: bool = Query(False)):
	"""Return cached live feeds plus the deployed South India sensor network."""
	return await get_sensor_snapshot(refresh=refresh)


@router.get("/live")
async def get_live_sensors(refresh: bool = Query(False)):
	return await get_sensor_snapshot(refresh=refresh)
