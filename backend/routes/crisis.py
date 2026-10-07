import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services import nlp, social

router = APIRouter()

MESSAGES_FILE = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "messages.json"
)


def load_messages():
    if not MESSAGES_FILE.exists():
        return []
    with MESSAGES_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def enrich(message):
    analysis = nlp.analyze_message(
        message.get("text", ""),
        fallback_state=message.get("state"),
        fallback_location=message.get("location"),
    )
    return {**message, "analysis": analysis}


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=2, max_length=2000)
    state: str | None = None
    location: str | None = None


@router.get("/")
async def get_crisis_messages(
    urgency_level: int | None = Query(None, ge=1, le=5),
    disaster: str | None = None,
    region: str | None = None,
    live: bool = Query(True, description="Include the live social feed"),
):
    """Crisis message feed with NLP extraction, filterable by urgency /
    disaster tag / region. Merges live bot-screened social intelligence
    (news desks, eNewspapers, Reddit, ReliefWeb) with the message corpus."""
    enriched = [enrich(message) for message in load_messages()]

    if live:
        posts, social_sources, updated_at = await social.get_social_feed()
        for post in posts:
            enriched.append({
                "id": post["id"],
                "source": post["platform_label"],
                "platform": post["platform"],
                "author": post["author"],
                "author_verified": post["author_verified"],
                "verification": post.get("verification"),
                "text": post.get("text") or post.get("title", ""),
                "url": post.get("url"),
                "time": post.get("published_at"),
                "live": True,
                "analysis": {
                    "location": post.get("location"),
                    "state": post.get("state"),
                    "disaster_tag": post.get("disaster_tag"),
                    "urgency_level": post.get("urgency_level"),
                    "urgency": post.get("urgency"),
                    "people_affected": None,
                    "required_aid": ["General Assistance"],
                    "code_mixed": False,
                },
            })
    else:
        social_sources, updated_at = None, None

    if urgency_level is not None:
        enriched = [
            message
            for message in enriched
            if message["analysis"]["urgency_level"] == urgency_level
        ]
    if disaster:
        enriched = [
            message
            for message in enriched
            if message["analysis"]["disaster_tag"].lower() == disaster.lower()
        ]
    if region:
        enriched = [
            message
            for message in enriched
            if (message["analysis"]["state"] or "").lower() == region.lower()
        ]

    return {
        "count": len(enriched),
        "messages": enriched,
        "social_sources": social_sources,
        "social_updated_at": updated_at,
        "urgency_scale": {
            "1": "Low",
            "2": "Guarded",
            "3": "Moderate",
            "4": "High",
            "5": "Critical",
        },
    }


@router.post("/analyze")
def analyze_report(request: AnalyzeRequest):
    """Run the code-mixed NLP extractor over a fresh crisis report."""
    analysis = nlp.analyze_message(
        request.text,
        fallback_state=request.state,
        fallback_location=request.location,
    )
    if not analysis["required_aid"]:
        raise HTTPException(status_code=400, detail="Unable to extract report details")
    return {"analysis": analysis}
