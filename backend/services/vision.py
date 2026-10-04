"""Gemini Vision satellite/drone imagery analysis + Supabase persistence."""

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
logger = logging.getLogger(__name__)

DEFAULT_BUCKET = "disaster-images"
DEFAULT_TABLE = "imagery_analysis"

PROMPT = """Analyze this satellite or drone disaster image.
Return ONLY valid JSON with exactly these keys:
- disaster_type: one of "Flood", "Earthquake", "Cyclone", "Wildfire", "Structural Damage"
- severity_score: integer 0-100, estimated damage severity percentage
- location: string (visible region/city if identifiable) or null
- structural_damage: short description of visible structural damage
- affected_structures: integer, estimated count of affected structures
- confidence: integer 0-100, confidence in the assessment
- bounding_metadata: array of objects {label, x, y, width, height} with
  normalized 0-1 coordinates for each damaged region detected
Assess visible evidence conservatively and do not invent coordinates."""

ALLOWED_TYPES = (
    "Flood",
    "Earthquake",
    "Cyclone",
    "Wildfire",
    "Structural Damage",
)


def _clamp(value, minimum=0, maximum=100):
    try:
        return max(minimum, min(maximum, int(value)))
    except (TypeError, ValueError):
        return minimum


def _sanitize(raw, location, disaster_category):
    """Coerce the model output into the structured response shape."""
    if not isinstance(raw, dict):
        raw = {}
    disaster_type = raw.get("disaster_type")
    if disaster_type not in ALLOWED_TYPES:
        disaster_type = disaster_category if disaster_category in ALLOWED_TYPES else "Structural Damage"

    bounding = []
    for box in raw.get("bounding_metadata") or []:
        if isinstance(box, dict):
            bounding.append(
                {
                    "label": str(box.get("label", "damaged-area"))[:80],
                    "x": float(box.get("x", 0) or 0),
                    "y": float(box.get("y", 0) or 0),
                    "width": float(box.get("width", 0) or 0),
                    "height": float(box.get("height", 0) or 0),
                }
            )

    return {
        "disaster_type": disaster_type,
        "severity_score": _clamp(raw.get("severity_score")),
        "location": raw.get("location") or location,
        "structural_damage": str(raw.get("structural_damage", ""))[:500],
        "affected_structures": _clamp(raw.get("affected_structures"), 0, 100000),
        "confidence": _clamp(raw.get("confidence")),
        "bounding_metadata": bounding[:16],
    }


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


def _extract_json(text):
    """Parse JSON out of the model response, tolerating code fences."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return json.loads(match.group(0) if match else text)


async def _gemini_result(image_bytes, mime_type, location, disaster_category):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return (
            _fallback_result(
                location,
                disaster_category,
                "Gemini Vision is not configured; no automated assessment was produced.",
            ),
            "unconfigured",
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        image_part = types.Part.from_bytes(data=image_bytes, media_type=mime_type)
        response = await client.aio.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
            contents=[PROMPT, image_part],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        return _sanitize(_extract_json(response.text), location, disaster_category), "gemini"
    except Exception as error:
        logger.warning("Gemini Vision request failed: %s - %s", type(error).__name__, error)
        return (
            _fallback_result(
                location,
                disaster_category,
                "Gemini Vision analysis failed; verify the API key, model, and network connection.",
            ),
            "unavailable",
        )


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
            bucket = os.getenv("SUPABASE_BUCKET", DEFAULT_BUCKET)
            path = f"{analysis['id']}-{filename}"
            client.storage.from_(bucket).upload(
                path, image_bytes, {"content-type": mime_type}
            )
            analysis["storage_path"] = path
            analysis["storage_url"] = f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"
            client.table(os.getenv("SUPABASE_TABLE", DEFAULT_TABLE)).insert(analysis).execute()
        except Exception as error:
            logger.warning("Supabase imagery persistence failed: %s", type(error).__name__)
            analysis["storage_status"] = f"unavailable: {type(error).__name__}"
    else:
        analysis["storage_status"] = "unconfigured"

    return analysis
