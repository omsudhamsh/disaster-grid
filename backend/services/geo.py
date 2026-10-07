"""PAN India geographic containment + distance utilities.

The national boundary (Natural Earth 50m, Douglas-Peucker simplified) is
shared with the frontend map so backend containment decisions match what
the user sees. Every live-data ingestion path funnels through
``is_inside_india`` so no neighbouring-country event can ever enter the
operational grid.
"""

import json
import math
from functools import lru_cache
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "india_outline.json"

KM_PER_DEG_LAT = 110.574
KM_PER_DEG_LNG_AT_EQUATOR = 111.320

# Measured worst cases: Kochi and Panaji sit ~1.5 km outside the simplified
# outline while Lahore (Pakistan) sits 20.3 km outside the border, so a 12 km
# coastal tolerance admits Indian coastal cities and rejects neighbours.
COAST_TOLERANCE_KM = 12.0

# Offshore union territories below the 50m source resolution.
TERRITORY_BOXES = (
    {"name": "Lakshadweep", "min_lat": 8.0, "max_lat": 12.4, "min_lng": 71.0, "max_lng": 74.0},
    {"name": "Andaman and Nicobar", "min_lat": 6.4, "max_lat": 14.0, "min_lng": 92.0, "max_lng": 94.5},
)

# National bounding box used for fast pre-filtering of feed results.
INDIA_BBOX = {"min_lat": 6.0, "max_lat": 37.1, "min_lng": 68.1, "max_lng": 97.5}


@lru_cache(maxsize=1)
def _load_outline():
    with DATA_FILE.open("r", encoding="utf-8") as file:
        outline = json.load(file)
    return outline["mainland"], outline["islands"]


def haversine_km(lat_a, lon_a, lat_b, lon_b):
    """Great-circle distance between two points, in kilometres."""
    try:
        lat_a, lon_a, lat_b, lon_b = (
            float(lat_a), float(lon_a), float(lat_b), float(lon_b),
        )
    except (TypeError, ValueError):
        return None
    radius = 6371.0088
    phi_a, phi_b = math.radians(lat_a), math.radians(lat_b)
    d_phi = math.radians(lat_b - lat_a)
    d_lambda = math.radians(lon_b - lon_a)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi_a) * math.cos(phi_b) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


def bearing_cardinal(lat_a, lon_a, lat_b, lon_b):
    """Compass bearing from point A to point B (e.g. 'NE')."""
    try:
        lat_a, lon_a, lat_b, lon_b = (
            float(lat_a), float(lon_a), float(lat_b), float(lon_b),
        )
    except (TypeError, ValueError):
        return None
    phi_a, phi_b = math.radians(lat_a), math.radians(lat_b)
    d_lambda = math.radians(lon_b - lon_a)
    x = math.sin(d_lambda) * math.cos(phi_b)
    y = math.cos(phi_a) * math.sin(phi_b) - math.sin(phi_a) * math.cos(phi_b) * math.cos(d_lambda)
    degrees = (math.degrees(math.atan2(x, y)) + 360) % 360
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][int(degrees / 45) % 8]


def in_bbox(latitude, longitude):
    return (
        INDIA_BBOX["min_lat"] <= latitude <= INDIA_BBOX["max_lat"]
        and INDIA_BBOX["min_lng"] <= longitude <= INDIA_BBOX["max_lng"]
    )


def _in_territory_box(latitude, longitude):
    return any(
        box["min_lat"] <= latitude <= box["max_lat"]
        and box["min_lng"] <= longitude <= box["max_lng"]
        for box in TERRITORY_BOXES
    )


def _point_in_ring(latitude, longitude, ring):
    inside = False
    count = len(ring)
    for i in range(count):
        lat_i, lng_i = ring[i][0], ring[i][1]
        lat_j, lng_j = ring[i - 1][0], ring[i - 1][1]
        if (lat_i > latitude) != (lat_j > latitude):
            intersect_lng = (lng_j - lng_i) * (latitude - lat_i) / (lat_j - lat_i) + lng_i
            if longitude < intersect_lng:
                inside = not inside
    return inside


def _distance_to_ring_km(latitude, longitude, ring):
    kx = KM_PER_DEG_LNG_AT_EQUATOR * math.cos(math.radians(latitude))
    ky = KM_PER_DEG_LAT
    best = float("inf")
    count = len(ring)
    for i in range(count - 1):
        ax = (ring[i][1] - longitude) * kx
        ay = (ring[i][0] - latitude) * ky
        bx = (ring[i + 1][1] - longitude) * kx
        by = (ring[i + 1][0] - latitude) * ky
        dx, dy = bx - ax, by - ay
        denom = dx * dx + dy * dy
        t = 0.0 if denom == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / denom))
        best = min(best, math.hypot(ax + t * dx, ay + t * dy))
    return best


def is_inside_india(latitude, longitude):
    """True when the coordinate falls within Indian territory.

    Neighbouring countries (Pakistan, Nepal, Bhutan, Bangladesh, Myanmar,
    China, Sri Lanka) are always rejected.
    """
    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except (TypeError, ValueError):
        return False

    if not (math.isfinite(latitude) and math.isfinite(longitude)):
        return False

    if not in_bbox(latitude, longitude):
        return False

    if _in_territory_box(latitude, longitude):
        return True

    mainland, islands = _load_outline()
    rings = [mainland, *islands]

    for ring in rings:
        if _point_in_ring(latitude, longitude, ring):
            return True

    # Coastal tolerance absorbs the simplified outline near the shoreline.
    for ring in rings:
        if _distance_to_ring_km(latitude, longitude, ring) <= COAST_TOLERANCE_KM:
            return True

    return False
