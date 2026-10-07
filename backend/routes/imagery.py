import base64
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from services import nasa
from services.geo import is_inside_india
from services.vision import LOCAL_STORAGE_DIR, analyze_image

router = APIRouter()


@router.get("/file/{filename}")
def stored_capture_file(filename: str):
    """Serve a locally archived capture (fallback when Supabase storage
    is unavailable). Only bare file names inside the archive are served."""
    safe_name = Path(filename).name
    path = LOCAL_STORAGE_DIR / safe_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Stored capture not found")
    return FileResponse(path)


@router.post("/analyze")
async def analyze_uploaded_image(
	image: UploadFile = File(...),
	location: str | None = Form(None),
	disaster_category: str | None = Form(None),
):
	if not image.content_type or not image.content_type.startswith("image/"):
		raise HTTPException(status_code=415, detail="Upload a supported image file")
	image_bytes = await image.read()
	if not image_bytes:
		raise HTTPException(status_code=400, detail="The image is empty")
	return await analyze_image(
		image_bytes,
		image.content_type,
		image.filename or "disaster-image",
		location,
		disaster_category,
	)


class NasaCaptureRequest(BaseModel):
	latitude: float = Field(ge=-90, le=90)
	longitude: float = Field(ge=-180, le=180)
	date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
	location: str | None = Field(default=None, max_length=160)
	disaster_category: str | None = Field(default=None, max_length=60)
	zoom: int = Field(default=9, ge=0, le=9)


@router.post("/nasa/analyze")
async def analyze_nasa_satellite_capture(payload: NasaCaptureRequest):
	"""Capture live NASA satellite imagery for an Indian location and run
	Vision analysis over it. Coordinates outside India are rejected."""
	if not is_inside_india(payload.latitude, payload.longitude):
		raise HTTPException(
			status_code=422,
			detail="Satellite analysis is restricted to locations inside India",
		)

	image_bytes, content_type, provider, tile = await _capture(payload)

	if image_bytes is None:
		raise HTTPException(
			status_code=502,
			detail="NASA imagery is temporarily unavailable; retry shortly",
		)

	filename = f"nasa-{tile['tile']['z']}-{tile['tile']['x']}-{tile['tile']['y']}.jpg"
	analysis = await analyze_image(
		image_bytes,
		content_type,
		filename,
		payload.location,
		payload.disaster_category,
	)
	analysis["nasa_capture"] = {
		"provider": provider,
		"latitude": payload.latitude,
		"longitude": payload.longitude,
		"date": payload.date or tile.get("date"),
		"coverage_km": tile.get("coverage_km"),
		"resolution_m": tile.get("resolution_m"),
		"tile": tile.get("tile"),
	}
	analysis["image_data_url"] = (
		f"data:{content_type};base64,{base64.b64encode(image_bytes).decode()}"
	)
	return analysis


@router.get("/nasa/image")
async def nasa_satellite_image(
	lat: float,
	lon: float,
	zoom: int = 9,
	date: str | None = None,
):
	"""Proxy a NASA GIBS true-colour capture for an Indian location."""
	if not is_inside_india(lat, lon):
		raise HTTPException(
			status_code=422,
			detail="Satellite captures are restricted to locations inside India",
		)

	image_bytes, content_type, provider, tile = await nasa.fetch_gibs_tile(
		lat, lon, zoom, date
	)
	if image_bytes is None:
		raise HTTPException(status_code=502, detail="NASA imagery unavailable")
	return Response(content=image_bytes, media_type=content_type)


@router.get("/nasa/capture")
async def nasa_capture_metadata(lat: float, lon: float, zoom: int = 9):
	"""Tile metadata + embeddable URL for the NASA true-colour capture."""
	if not is_inside_india(lat, lon):
		raise HTTPException(
			status_code=422,
			detail="Satellite captures are restricted to locations inside India",
		)
	tile = nasa.gibs_tile_url(lat, lon, zoom)
	return {
		"source": "NASA GIBS · VIIRS SNPP Corrected Reflectance (True Colour)",
		"india_verified": True,
		**tile,
	}


async def _capture(payload):
	"""Landsat (api.nasa.gov) first, GIBS true-colour fallback."""
	if payload.date:
		(
			image_bytes,
			content_type,
			provider,
		) = await nasa.fetch_landsat_imagery(
			payload.latitude, payload.longitude, payload.date
		)
		if image_bytes:
			# dim=0.15 deg captures a ~33 km Landsat scene at 30 m/px.
			return image_bytes, content_type, provider, {
				"tile": {"z": 0, "x": 0, "y": 0},
				"coverage_km": 33.2,
				"resolution_m": 30.0,
			}
	image_bytes, content_type, provider, tile = await nasa.fetch_gibs_tile(
		payload.latitude, payload.longitude, payload.zoom, payload.date
	)
	if image_bytes is None:
		return None, None, provider, tile
	return image_bytes, content_type, provider, tile
