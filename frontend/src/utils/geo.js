/**
 * Pan India geography definition.
 *
 * The national boundary comes from Natural Earth 50m, simplified with
 * Douglas-Peucker (0.015 deg tolerance) by
 * `backend/tools/build_india_outline.py`. It is used for two purposes:
 *
 *   1. Restricting the operational map to Indian boundaries (mask layer).
 *   2. Guaranteeing that no marker outside India is ever rendered.
 *
 * Because the outline is simplified, strictly-inside tests are combined
 * with a small coastal tolerance and explicit offshore union-territory
 * boxes, so real coastal cities and island atolls are never dropped while
 * neighbouring countries stay excluded.
 */

import {
  INDIA_MAINLAND,
  INDIA_ISLANDS,
} from "./indiaOutline.js";

export const INDIA_CENTER = [22.5937, 78.9629];
export const INDIA_ZOOM = 5;

/** Panning limits for the map viewport. */
export const INDIA_BOUNDS = [
  [6.0, 67.0],
  [36.5, 98.5],
];

/**
 * Outer ring of the restriction mask: a full-world rectangle (clamped to
 * the Web Mercator latitude limit) that carries the Indian boundary as
 * holes. Leaflet fills paths with the even-odd rule, so every neighbour is
 * dimmed while India stays fully visible.
 */
export const WORLD_OUTLINE = [
  [-84, -180],
  [84, -180],
  [84, 180],
  [-84, 180],
];

export { INDIA_MAINLAND, INDIA_ISLANDS };

/**
 * Offshore union territories whose individual atolls fall below the
 * 50m resolution of the source boundary. They are also punched out of
 * the restriction mask so island incidents are never dimmed.
 */
export const TERRITORY_BOXES = [
  {
    name: "Lakshadweep",
    minLat: 8.0,
    maxLat: 12.4,
    minLng: 71.0,
    maxLng: 74.0,
  },
  {
    name: "Andaman and Nicobar",
    minLat: 6.4,
    maxLat: 14.0,
    minLng: 92.0,
    maxLng: 94.5,
  },
];

/** Territory boxes as polygon rings (for the mask holes). */
export const TERRITORY_RINGS = TERRITORY_BOXES.map((box) => [
  [box.minLat, box.minLng],
  [box.maxLat, box.minLng],
  [box.maxLat, box.maxLng],
  [box.minLat, box.maxLng],
]);

/**
 * Coastal tolerance in kilometres.
 *
 * Measured worst cases: Kochi and Panaji sit 1.5 km outside the simplified
 * outline, while Lahore (Pakistan) is 20.3 km outside the border. A 12 km
 * tolerance therefore admits every Indian coastal location while still
 * rejecting neighbouring territory.
 */
export const COAST_TOLERANCE_KM = 12;

const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LNG_AT_EQUATOR = 111.32;

/**
 * Shortest distance in kilometres from a point to a boundary ring,
 * measured in a local equirectangular projection.
 */
function distanceToRingKm(latitude, longitude, ring) {
  const kx =
    KM_PER_DEG_LNG_AT_EQUATOR *
    Math.cos((latitude * Math.PI) / 180);
  const ky = KM_PER_DEG_LAT;

  let best = Infinity;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const ax = (ring[i][1] - longitude) * kx;
    const ay = (ring[i][0] - latitude) * ky;
    const bx = (ring[i + 1][1] - longitude) * kx;
    const by = (ring[i + 1][0] - latitude) * ky;

    const dx = bx - ax;
    const dy = by - ay;

    const t =
      dx === 0 && dy === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))
          );

    const distance = Math.hypot(
      ax + t * dx,
      ay + t * dy
    );

    if (distance < best) {
      best = distance;
    }
  }

  return best;
}

/**
 * Ray-casting point-in-polygon test (ring coordinates are [lat, lng]).
 */
function pointInRing(latitude, longitude, ring) {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yI = ring[i][0];
    const xI = ring[i][1];
    const yJ = ring[j][0];
    const xJ = ring[j][1];

    const intersects =
      yI > latitude !== yJ > latitude &&
      longitude <
        ((xJ - xI) * (latitude - yI)) / (yJ - yI) + xI;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function inTerritoryBox(latitude, longitude) {
  return TERRITORY_BOXES.some(
    (box) =>
      latitude >= box.minLat &&
      latitude <= box.maxLat &&
      longitude >= box.minLng &&
      longitude <= box.maxLng
  );
}

/**
 * True when the coordinate falls within India's boundaries, including
 * offshore union territories.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
export function isInsideIndia(latitude, longitude) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }

  if (inTerritoryBox(latitude, longitude)) {
    return true;
  }

  const rings = [INDIA_MAINLAND, ...INDIA_ISLANDS];

  for (let i = 0; i < rings.length; i += 1) {
    if (pointInRing(latitude, longitude, rings[i])) {
      return true;
    }
  }

  // Coastal tolerance absorbs the simplified outline near the coast.
  for (let i = 0; i < rings.length; i += 1) {
    if (
      distanceToRingKm(
        latitude,
        longitude,
        rings[i]
      ) <= COAST_TOLERANCE_KM
    ) {
      return true;
    }
  }

  return false;
}