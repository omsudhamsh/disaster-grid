from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from services.vision import analyze_image

router = APIRouter()


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
