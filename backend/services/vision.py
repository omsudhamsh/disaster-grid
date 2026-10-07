"""Gemini Vision satellite/drone imagery analysis + result persistence.

Gemini runs over the REST endpoint (the google-genai SDK's async client
hangs on some networks) with automatic model discovery, so a deprecated
model name can never brick analysis. Results persist to Supabase when
the project allows it, with a local-disk fallback so captures are never
lost and the UI always shows a truthful storage status.
"""

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
logger = logging.getLogger(__name__)

DEFAULT_BUCKET = "disaster-images"
DEFAULT_TABLE = "imagery_analysis"
LOCAL_STORAGE_DIR = Path(__file__).resolve().parent.parent / "data" / "imagery"

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_TIMEOUT_SECONDS = 120.0

# Ordered fallbacks when the configured model is unavailable. The first
# models are the ones measured to be fast and stable for vision+JSON on
# this project's API key (gemini-3.8-flash is a slow "thinking" model and
# frequently times out; 2.x generations are deprecated for new keys).
FALLBACK_MODEL_CANDIDATES = (
    "gemini-3.6-flash",
    "gemini-3-flash-preview",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-2.0-flash",
)

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
        disaster_type = (
            disaster_category if disaster_category in ALLOWED_TYPES else "Structural Damage"
        )

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


def _summarize_error(body, limit=220):
    """Extract a short, secret-free reason from an API error body."""
    try:
        data = json.loads(body)
        message = data.get("error", {}).get("message", "")
        if message:
            return message[:limit]
    except Exception:
        pass
    return (body or "unknown error")[:limit]


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

    configured = os.getenv("GEMINI_MODEL", "").strip()
    candidates = ([configured] if configured else []) + [
        name for name in FALLBACK_MODEL_CANDIDATES if name != configured
    ]

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(image_bytes).decode(),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
    }

    async def post_generate(client, model_name, with_thinking):
        body = dict(payload)
        config = {**payload["generationConfig"]}
        if with_thinking:
            config["thinkingConfig"] = {"thinkingBudget": 0}
        body["generationConfig"] = config
        return await client.post(
            f"{GEMINI_BASE_URL}/models/{model_name}:generateContent",
            params={"key": api_key},
            json=body,
        )

    failures = []
    try:
        async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SECONDS) as client:
            for model_name in candidates:
                try:
                    response = await post_generate(client, model_name, with_thinking=True)
                    # A few models reject thinkingBudget:0 — retry without it.
                    if (
                        response.status_code == 400
                        and "invalid argument" in response.text.lower()
                    ):
                        response = await post_generate(client, model_name, with_thinking=False)
                except Exception as request_error:
                    failures.append(f"{model_name}: {type(request_error).__name__}")
                    continue

                if response.status_code == 200:
                    try:
                        parts = response.json()["candidates"][0]["content"]["parts"]
                        text = next(
                            (part.get("text", "") for part in parts if "text" in part),
                            "",
                        )
                        return _sanitize(_extract_json(text), location, disaster_category), "gemini"
                    except Exception as parse_error:
                        failures.append(f"{model_name}: malformed response ({type(parse_error).__name__})")
                        continue

                reason = _summarize_error(response.text)
                failures.append(f"{model_name} -> HTTP {response.status_code}: {reason[:80]}")

                # Invalid credentials never recover on another model.
                if response.status_code in (400, 401, 403):
                    return (
                        _fallback_result(
                            location,
                            disaster_category,
                            f"Gemini Vision rejected the request (HTTP {response.status_code}): {reason}",
                        ),
                        "unavailable",
                    )

                # 404 (deprecated), 429, 5xx: try the next candidate.
    except Exception as error:
        logger.warning(
            "Gemini Vision pipeline error: %s - %s", type(error).__name__, str(error)[:160]
        )
        failures.append(f"pipeline: {type(error).__name__}")

    detail = "; ".join(failures) if failures else "network unreachable"
    logger.warning("Gemini Vision request failed: %s", detail[:300])
    return (
        _fallback_result(
            location,
            disaster_category,
            f"Gemini Vision analysis failed; verify the API key, model, and network connection. ({detail[:200]})",
        ),
        "unavailable",
    )


def _persist_supabase(analysis, image_bytes, mime_type, filename):
    """Upload the capture + insert the row. Returns (status, path, url)."""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not (supabase_url and supabase_key):
        return "unconfigured", None, None

    bucket = os.getenv("SUPABASE_BUCKET", DEFAULT_BUCKET)

    try:
        from supabase import create_client

        client = create_client(supabase_url, supabase_key)
        path = f"{analysis['id']}-{filename}"

        try:
            client.storage.from_(bucket).upload(
                path, image_bytes, {"content-type": mime_type, "upsert": "true"}
            )
        except Exception as upload_error:
            # Most common cause: the bucket does not exist yet. Provision
            # it when the key has storage admin rights, then retry once.
            if not _ensure_bucket(client, bucket):
                raise
            client.storage.from_(bucket).upload(
                path, image_bytes, {"content-type": mime_type, "upsert": "true"}
            )

        storage_path = path
        storage_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{path}"
        try:
            client.table(os.getenv("SUPABASE_TABLE", DEFAULT_TABLE)).insert(analysis).execute()
        except Exception as table_error:
            logger.warning(
                "Supabase metadata insert failed: %s", type(table_error).__name__
            )

        return "stored", storage_path, storage_url
    except Exception as error:
        logger.warning(
            "Supabase imagery persistence failed: %s - %s",
            type(error).__name__,
            str(error)[:200],
        )
        reason = str(error)
        if "Bucket not found" in str(error) or "row-level security" in str(error):
            detail = (
                "bucket missing or not writable — create a public "
                f"'{bucket}' bucket in the Supabase dashboard"
            )
        else:
            detail = f"{type(error).__name__}"
        return f"unavailable: {detail}", None, None


def _ensure_bucket(client, bucket):
    """Best-effort bucket provisioning (needs storage admin rights)."""
    try:
        client.storage.create_bucket(bucket, options={"public": True})
        return True
    except Exception:
        return False


def _store_locally(analysis, image_bytes):
    """Fallback archive when Supabase is unavailable. Returns (path, url)."""
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", f"{analysis['id']}-{analysis['filename']}")
    try:
        LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        (LOCAL_STORAGE_DIR / safe_name).write_bytes(image_bytes)
        return safe_name, f"/api/imagery/file/{safe_name}"
    except Exception as write_error:
        logger.warning("Local imagery persistence failed: %s", type(write_error).__name__)
        return None, None


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
        status, path, url = _persist_supabase(analysis, image_bytes, mime_type, filename)
        analysis["storage_status"] = status
        if path:
            analysis["storage_path"] = path
            analysis["storage_url"] = url
        if status != "stored":
            # Local grid archive so the capture is never lost while the
            # Supabase bucket is being provisioned.
            local_name, local_url = _store_locally(analysis, image_bytes)
            if local_name:
                analysis["storage_path"] = f"local:{local_name}"
                analysis["storage_url"] = local_url
                analysis["storage_status"] = "stored (local archive)"
    else:
        analysis["storage_status"] = "unconfigured"

    return analysis
