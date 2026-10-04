import base64
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
logger = logging.getLogger(__name__)

PROMPT = """Analyze this satellite/drone disaster image. Return only valid JSON with these keys:
disaster_type (one of Flood, Earthquake, Wildfire, Cyclone, Structural Damage),
severity_score (integer 0-100), location (string or null),
structural_damage (string), affected_structures (integer), confidence (integer 0-100),
bounding_metadata (array of objects with label, x, y, width, height, all normalized 0-1).
Assess visible evidence conservatively and do not invent coordinates."""


def _fallback_result(location, disaster_category, message):
	return {
		"disaster_type": disaster_category or "Structural Damage",
		"severity_score": 0,
		"location": location,
		"structural_damage": message,
		"affected_structures": 0,
		"confidence": 0,
		"bounding_metadata": [],
	}


async def _gemini_result(image_bytes, mime_type, location, disaster_category):
	api_key = os.getenv("GEMINI_API_KEY")
	if not api_key:
		return _fallback_result(
			location,
			disaster_category,
			"Gemini Vision is not configured; no automated assessment was produced.",
		), "unconfigured"

	try:
		from google import genai

		client = genai.Client(api_key=api_key)
		interaction = client.interactions.create(
			model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
			input=[
				{"type": "text", "text": PROMPT},
				{
					"type": "image",
					"data": base64.b64encode(image_bytes).decode("ascii"),
					"mime_type": mime_type,
				},
			],
			response_format={"type": "text", "mime_type": "application/json"},
		)
		return json.loads(interaction.output_text), "gemini"
	except Exception as error:
		logger.warning("Gemini Vision request failed: %s - %s", type(error).__name__, error)
		return _fallback_result(
			location,
			disaster_category,
			"Gemini Vision analysis failed; verify the API key, model, and network connection.",
		), "unavailable"


async def analyze_image(image_bytes, mime_type, filename, location=None, disaster_category=None):
    result, provider = await _gemini_result(image_bytes, mime_type, location, disaster_category)
    analysis = {
        "id": str(uuid4()),
        "filename": filename,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "location": location,
        "disaster_category": disaster_category,
        "provider": provider,
        "result": result,
    }

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if supabase_url and supabase_key:
        try:
            from supabase import create_client

            client = create_client(supabase_url, supabase_key)
            path = f"imagery/{analysis['id']}-{filename}"
            client.storage.from_(os.getenv("SUPABASE_BUCKET", "imagery")).upload(
                path, image_bytes, {"content-type": mime_type}
            )
            analysis["storage_path"] = path
            client.table(os.getenv("SUPABASE_TABLE", "imagery_analysis")).insert(analysis).execute()
        except Exception as error:
            logger.warning("Supabase imagery persistence failed: %s", type(error).__name__)
            analysis["storage_status"] = f"unavailable: {type(error).__name__}"
    else:
        analysis["storage_status"] = "unconfigured"

    return analysis
