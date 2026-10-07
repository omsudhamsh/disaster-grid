from fastapi import APIRouter, Query

from services import social

router = APIRouter()


@router.get("/feed")
async def get_social_feed(
    platform: str | None = Query(None),
    disaster: str | None = Query(None),
    urgency_level: int | None = Query(None, ge=1, le=5),
    refresh: bool = Query(False, description="Bypass the cache and fetch fresh from the live sources"),
):
    """Live social intelligence feed (news desks, eNewspapers, Reddit,
    official alert services) restricted to Indian calamities and screened
    for bots. `refresh=true` forces a fresh fetch (used by the manual
    reload button)."""
    posts, sources, updated_at = await social.get_social_feed(force=refresh)

    if platform:
        posts = [post for post in posts if post["platform"] == platform.lower()]
    if disaster:
        posts = [
            post
            for post in posts
            if post.get("disaster_tag", "").lower() == disaster.lower()
        ]
    if urgency_level is not None:
        posts = [
            post for post in posts if post.get("urgency_level") == urgency_level
        ]

    return {
        "count": len(posts),
        "posts": posts,
        "sources": sources,
        "updated_at": updated_at,
        "cache_ttl_seconds": social.CACHE_TTL_SECONDS,
    }
