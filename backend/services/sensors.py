import asyncio
import json
import time
from pathlib import Path

import httpx

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "sensors.json"
USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_SECONDS = 300
_cache = {"timestamp": 0.0, "earthquakes": [], "weather": None}


def _load_static_sensors():
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


async def _fetch_live_feeds():
    earthquake_params = {
        "format": "geojson",
        "minmagnitude": 3.0,
        "latitude": 13.0827,
        "longitude": 80.2707,
        "maxradiuskm": 1000,
    }
    weather_params = {
        "latitude": 13.0827,
        "longitude": 80.2707,
        "current": "precipitation,rain,wind_speed_10m",
    }

    async with httpx.AsyncClient(timeout=12) as client:
        earthquake_response, weather_response = await asyncio.gather(
            client.get(USGS_URL, params=earthquake_params),
            client.get(WEATHER_URL, params=weather_params),
            return_exceptions=True,
        )

    earthquakes = []
    if isinstance(earthquake_response, httpx.Response) and earthquake_response.is_success:
        for feature in earthquake_response.json().get("features", []):
            properties = feature.get("properties", {})
            coordinates = feature.get("geometry", {}).get("coordinates", [])
            earthquakes.append({
                "id": feature.get("id"),
                "name": properties.get("place", "Regional earthquake"),
                "magnitude": properties.get("mag"),
                "time": properties.get("time"),
                "latitude": coordinates[1] if len(coordinates) > 1 else None,
                "longitude": coordinates[0] if coordinates else None,
                "source": "USGS",
            })

    weather = None
    if isinstance(weather_response, httpx.Response) and weather_response.is_success:
        weather = weather_response.json().get("current")

    return earthquakes, weather


async def get_sensor_snapshot(refresh=False):
    now = time.monotonic()
    if refresh or now - _cache["timestamp"] >= CACHE_TTL_SECONDS:
        try:
            earthquakes, weather = await _fetch_live_feeds()
            _cache.update({"timestamp": now, "earthquakes": earthquakes, "weather": weather})
            feed_status = "live"
        except (httpx.HTTPError, ValueError):
            feed_status = "degraded"
    else:
        feed_status = "cached"

    static_sensors = _load_static_sensors()
    return {
        "status": feed_status,
        "updated_at": time.time(),
        "cache_ttl_seconds": CACHE_TTL_SECONDS,
        "sensors": static_sensors,
        "live": {
            "earthquakes": _cache["earthquakes"],
            "weather": _cache["weather"],
        },
    }