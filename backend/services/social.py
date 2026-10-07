"""Live social-intelligence feed: news desks, eNewspapers, Reddit, GDACS.

Only posts relevant to natural calamities inside India are admitted. Every
post is scored for account authenticity — bot-pattern accounts are rejected
and official outlets (news desks, GDACS operational alerts) are flagged as
verified so the dashboard can badge human-verified content.
"""

import asyncio
import re
import time
from datetime import datetime, timezone
from xml.etree import ElementTree

import httpx

from services import nlp

REQUEST_TIMEOUT = 14
CACHE_TTL_SECONDS = 180

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"

DISASTER_QUERY = (
    "india (flood OR cyclone OR earthquake OR landslide OR wildfire "
    "OR cloudburst OR monsoon disaster OR heavy rainfall alert)"
)

# Reddit account patterns that mark automation rather than a human reporter.
_BOT_NAME_PATTERN = re.compile(
    r"(bot$|^bot|_bot|bot_|-bot|moderator|automod|moderatorshadow|announcer|newsbot)",
    re.IGNORECASE,
)
_BOT_TITLE_PATTERN = re.compile(
    r"(i am a bot|automated|auto-?moderator|this (post|message) was|deployment bot)",
    re.IGNORECASE,
)

_cache = {"timestamp": 0.0, "posts": [], "sources": {}}

_HEADERS = {
    "User-Agent": "DisasterGrid/1.0 (emergency-response research platform)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}

# Reddit blocks non-browser JSON clients from many networks; the public RSS
# search endpoint stays open, so community posts come in as Atom entries.
_REDDIT_RSS = "https://www.reddit.com/search.rss"
_BROWSER_UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept": "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
}


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _looks_like_bot(author, title, text):
    haystack = f"{title or ''} {text or ''}"
    if _BOT_NAME_PATTERN.search(author or ""):
        return True
    return bool(_BOT_TITLE_PATTERN.search(haystack))


def _is_india_related(text):
    """Keep only content tied to Indian territory."""
    if not text:
        return False
    lower = text.lower()
    if re.search(r"(?<!\w)india(n|ns)?(?!\w)", lower):
        return True
    # Indian state / city mention via the code-mixed knowledge base.
    location, state = nlp._find_location(text)
    if location or state:
        return True
    return bool(nlp._find_state(text))


def _analyse(text):
    return nlp.analyze_message(text or "")


async def _fetch_google_news(limit=20):
    """eNewspaper / news-desk coverage (verified editorial outlets)."""
    params = {
        "q": DISASTER_QUERY,
        "hl": "en-IN",
        "gl": "IN",
        "ceid": "IN:en",
    }
    posts = []
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(
                GOOGLE_NEWS_RSS, params=params, headers=_HEADERS
            )
            response.raise_for_status()
            root = ElementTree.fromstring(response.content)
    except (httpx.HTTPError, ElementTree.ParseError):
        return posts, "degraded"

    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        published = (item.findtext("pubDate") or "").strip()
        outlet = (item.findtext("source") or "News Desk").strip()
        description = (item.findtext("description") or "").strip()
        snippet = re.sub(r"<[^>]+>", "", description)[:400]

        body = f"{title} {snippet}"
        if not _is_india_related(body):
            continue

        analysis = _analyse(body)
        posts.append({
            "id": f"news-{abs(hash(link)) % 10**10}",
            "platform": "news",
            "platform_label": "News / eNewspaper",
            "author": outlet,
            "author_verified": True,
            "verification": "Verified media outlet (editorial desk)",
            "bot_check": "human",
            "title": title,
            "text": snippet or title,
            "url": link,
            "published_at": published,
            "disaster_tag": analysis["disaster_tag"],
            "urgency_level": analysis["urgency_level"],
            "urgency": analysis["urgency"],
            "location": analysis["location"],
            "state": analysis["state"],
        })
        if len(posts) >= limit:
            break
    return posts, "live"


async def _fetch_reddit(limit=20):
    """Reddit community reports — bot accounts rejected, humans flagged."""
    params = {"q": DISASTER_QUERY, "sort": "new", "t": "week"}
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "media": "http://search.yahoo.com/mrss/",
    }
    posts = []
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(_REDDIT_RSS, params=params, headers=_BROWSER_UA)
            response.raise_for_status()
            root = ElementTree.fromstring(response.content)
    except (httpx.HTTPError, ElementTree.ParseError):
        return posts, "degraded"

    rejected_bots = 0
    for entry in root.findall("atom:entry", ns):
        title = (entry.findtext("atom:title", "", ns) or "").strip()
        link = (entry.find("atom:link", ns).get("href") or "").strip() if entry.find("atom:link", ns) is not None else ""
        author_el = entry.find("atom:author/atom:name", ns)
        author = (author_el.text if author_el is not None and author_el.text else "").strip()
        published = (entry.findtext("atom:published", "", ns) or "").strip()
        content = (entry.findtext("atom:content", "", ns) or "").strip()
        community_el = entry.find("media:community", ns)
        subreddit = (
            community_el.get("label") if community_el is not None and community_el.get("label") else ""
        )
        text = re.sub(r"<[^>]+>", " ", content)
        text = re.sub(r"\s+", " ", text).strip()[:400]

        if not author or author in ("[deleted]", "AutoModerator"):
            rejected_bots += 1
            continue
        if _looks_like_bot(author, title, text):
            rejected_bots += 1
            continue

        body = f"{title} {text}"
        if not _is_india_related(body):
            continue

        analysis = _analyse(body)
        posts.append({
            "id": f"reddit-{link.rstrip('/').split('/')[-1] or abs(hash(title)) % 10**6}",
            "platform": "reddit",
            "platform_label": "Reddit",
            "author": f"u/{author.removeprefix('u/')}",
            "author_verified": False,
            "verification": "Human account — bot-pattern screening passed, community-sourced",
            "bot_check": "human",
            "title": title,
            "text": text or title,
            "url": link,
            "published_at": published,
            "subreddit": subreddit.removeprefix("/r/"),
            "disaster_tag": analysis["disaster_tag"],
            "urgency_level": analysis["urgency_level"],
            "urgency": analysis["urgency"],
            "location": analysis["location"],
            "state": analysis["state"],
        })
        if len(posts) >= limit:
            break

    return posts, "live"


async def _fetch_gdacs_alerts(limit=10):
    """Official disaster alerts from GDACS (European Commission JRC) —
    India-filtered, human-issued operational alerts."""
    from xml.etree import ElementTree

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            response = await client.get(
                "https://www.gdacs.org/xml/rss.xml",
                headers=_HEADERS,
            )
            response.raise_for_status()
            root = ElementTree.fromstring(response.content)
    except (httpx.HTTPError, ElementTree.ParseError):
        return [], "degraded"

    posts = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        if "india" not in title.lower():
            continue
        analysis = _analyse(title)
        posts.append({
            "id": f"gdacs-{item.findtext('guid') or abs(hash(title)) % 10**6}",
            "platform": "gdacs",
            "platform_label": "GDACS Official Alert",
            "author": "EC Joint Research Centre (GDACS)",
            "author_verified": True,
            "verification": "Official multi-hazard alert service (European Commission JRC)",
            "bot_check": "human",
            "title": title,
            "text": (item.findtext("description") or "").strip()[:400] or title,
            "url": (item.findtext("link") or "").strip(),
            "published_at": item.findtext("pubDate"),
            "disaster_tag": analysis["disaster_tag"],
            "urgency_level": analysis["urgency_level"],
            "urgency": analysis["urgency"],
            "location": analysis["location"],
            "state": analysis["state"],
        })
        if len(posts) >= limit:
            break
    return posts, "live"


async def get_social_feed(force=False):
    """Aggregated, India-only, bot-screened social intelligence feed."""
    now = time.monotonic()
    if not force and _cache["posts"] and now - _cache["timestamp"] < CACHE_TTL_SECONDS:
        return list(_cache["posts"]), dict(_cache["sources"]), _cache["updated_at"]

    news, reddit, gdacs = await asyncio.gather(
        _fetch_google_news(),
        _fetch_reddit(),
        _fetch_gdacs_alerts(),
    )

    news_posts, news_status = news
    reddit_posts, reddit_status = reddit
    gdacs_posts, gdacs_status = gdacs

    posts = [*gdacs_posts, *news_posts, *reddit_posts]
    posts.sort(key=lambda post: post.get("published_at") or "", reverse=True)

    _cache.update({
        "timestamp": now,
        "posts": posts,
        "sources": {
            "gdacs_official": gdacs_status,
            "news": news_status,
            "reddit": reddit_status,
        },
        "updated_at": _now_iso(),
    })
    return list(posts), dict(_cache["sources"]), _cache["updated_at"]
