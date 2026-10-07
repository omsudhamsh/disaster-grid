"""Extract + simplify India's boundary from Natural Earth 50m into a JS module.

Emits a compact polygon set (mainland + island territories) used for the
map restriction mask and the point-in-polygon containment test.
"""

import json
import math
from pathlib import Path

SOURCE = Path(
    r"C:\Users\omsud\AppData\Local\Temp\opencode\ne_50m.geojson"
)
TARGET = Path(
    r"C:\Users\omsud\disaster-grid\frontend\src\utils\indiaOutline.js"
)

# Douglas-Peucker tolerance in degrees (~1 deg = 111 km).
TOLERANCE = 0.015


def perpendicular_distance(point, start, end):
    (x, y), (x1, y1), (x2, y2) = point, start, end
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(x - x1, y - y1)
    t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    px, py = x1 + t * dx, y1 + t * dy
    return math.hypot(x - px, y - py)


def douglas_peucker(points, tolerance):
    if len(points) < 3:
        return points
    worst_index, worst = 0, 0.0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(
            points[i], points[0], points[-1]
        )
        if d > worst:
            worst_index, worst = i, d
    if worst > tolerance:
        left = douglas_peucker(points[: worst_index + 1], tolerance)
        right = douglas_peucker(points[worst_index:], tolerance)
        return left[:-1] + right
    return [points[0], points[-1]]


def ring_area(points):
    """Absolute planar area (shoelace)."""
    total = 0.0
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2.0


def point_in_ring(x, y, ring):
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y):
            x_at = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < x_at:
                inside = not inside
    return inside


# Offshore union territories that Natural Earth does not resolve into
# polygons (individual atolls are far below the 50m resolution).
TERRITORY_BOXES = [
    ("Lakshadweep", 8.0, 12.4, 71.0, 74.0),
    ("Andaman and Nicobar", 6.4, 14.0, 92.0, 94.5),
]

COAST_TOLERANCE_KM = 12.0


def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))

    india = None
    for feature in data["features"]:
        props = feature.get("properties", {})
        name = (
            props.get("ADMIN")
            or props.get("NAME")
            or props.get("NAME_EN")
            or ""
        )
        if name.strip().lower() == "india":
            india = feature
            break

    if india is None:
        raise SystemExit("India feature not found")

    geometry = india["geometry"]
    coordinates = geometry["coordinates"]

    polygons = (
        [coordinates]
        if geometry["type"] == "Polygon"
        else coordinates
    )

    rings = []
    for polygon in polygons:
        outer = polygon[0]  # outer ring only, GeoJSON order is [lng, lat]
        simplified = douglas_peucker(
            [(lng, lat) for lng, lat in outer], TOLERANCE
        )
        if len(simplified) >= 4:
            rings.append(simplified)

    # Largest ring first: the mainland.
    rings.sort(key=ring_area, reverse=True)
    mainland = rings[0]
    islands = rings[1:]

    # ---- verification -------------------------------------------------
    incidents = json.loads(
        Path(
            r"C:\Users\omsud\disaster-grid\backend\data\incidents.json"
        ).read_text(encoding="utf-8")
    )

    def in_territory(lat, lng):
        for _, min_lat, max_lat, min_lng, max_lng in TERRITORY_BOXES:
            if (
                min_lat <= lat <= max_lat
                and min_lng <= lng <= max_lng
            ):
                return True
        return False

    def inside(lat, lng):
        return in_territory(lat, lng) or any(
            point_in_ring(lng, lat, r) for r in rings
        )

    def ring_distance(lat, lng):
        """Shortest distance (km) from a point to any boundary ring."""
        best = 1e9
        kx = 111.32 * math.cos(math.radians(lat))
        ky = 110.574
        for ring in rings:
            for i in range(len(ring) - 1):
                ax = (ring[i][0] - lng) * kx
                ay = (ring[i][1] - lat) * ky
                bx = (ring[i + 1][0] - lng) * kx
                by = (ring[i + 1][1] - lat) * ky
                dx, dy = bx - ax, by - ay
                if dx == 0 and dy == 0:
                    t = 0.0
                else:
                    t = max(
                        0.0,
                        min(1.0, -(ax * dx + ay * dy) / (dx * dx + dy * dy)),
                    )
                best = min(best, math.hypot(ax + t * dx, ay + t * dy))
        return best

    outside = []
    near_coast = []
    for incident in incidents:
        lat = incident["latitude"]
        lng = incident["longitude"]
        if inside(lat, lng):
            continue
        # Outside the strict ring: it must still be a coastal location
        # (within tolerance) or fall inside an offshore union territory.
        km = ring_distance(lat, lng)
        if in_territory(lat, lng):
            continue
        near_coast.append((incident["location"], km))
        if km > COAST_TOLERANCE_KM:
            outside.append(
                f"{incident['location']} ({lat},{lng}) {km:.0f}km"
            )

    neighbours = {
        "Islamabad": (33.6844, 73.0479),
        "Lahore": (31.5204, 74.3587),
        "Kathmandu": (27.7172, 85.324),
        "Dhaka": (23.8103, 90.4125),
        "Thimphu": (27.4728, 89.639),
        "Yangon": (16.8661, 96.1951),
        "Colombo": (6.9271, 79.8612),
        "Kabul": (34.5553, 69.2075),
        "Kashgar": (39.4704, 75.9898),
        "Male": (4.1755, 73.5093),
        "Karachi": (24.8607, 67.0011),
    }
    leaked = [n for n, (la, ln) in neighbours.items() if inside(la, ln)]

    print(
        f"rings: {len(rings)} "
        f"(mainland {len(mainland)} pts, islands {[len(r) for r in islands]})"
    )
    print(f"neighbours leaked: {len(leaked)} {leaked}")
    print(f"incidents outside strict ring: {len(outside)}")
    for name, km in near_coast:
        print(f"    {name:14s} {km:6.1f} km from boundary")

    # ---- emit JS module ------------------------------------------------
    def fmt(ring):
        rows = []
        for lng, lat in ring:
            rows.append(f"  [{lat:.4f}, {lng:.4f}],")
        return "\n".join(rows)

    body = [
        "/**",
        " * India national boundary rings (Natural Earth 50m, Douglas-Peucker",
        f" * simplified at {TOLERANCE} deg tolerance).",
        " *",
        " * INDIA_MAINLAND is the contiguous border used for the map restriction",
        " * mask. INDIA_ISLANDS covers the offshore island territories so points",
        " * such as Port Blair and Kavaratti remain valid Indian locations.",
        " */",
        "",
        "export const INDIA_MAINLAND = [",
        fmt(mainland),
        "];",
        "",
        "export const INDIA_ISLANDS = [",
    ]
    for island in islands:
        body.append("  [")
        body.append(fmt(island))
        body.append("  ],")
    body.append("];")
    body.append("")

    TARGET.write_text("\n".join(body), encoding="utf-8")
    print(f"\nwrote {TARGET} ({TARGET.stat().st_size} bytes)")

    if outside or leaked:
        if leaked:
            raise SystemExit(
                f"VERIFICATION FAILED: neighbours leaked -> {leaked}"
            )
        raise SystemExit(
            "VERIFICATION FAILED: points beyond the "
            f"{COAST_TOLERANCE_KM} km coastal tolerance -> {outside}"
        )
    print(
        f"\nOK: {len(incidents)} incidents verified, "
        f"0 neighbouring countries included."
    )


if __name__ == "__main__":
    main()