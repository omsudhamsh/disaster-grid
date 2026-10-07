/**
 * Hexagonal binning (hexbin heatmap) geometry.
 *
 * Pure, framework-free helpers so the binning maths can be verified
 * independently of the Leaflet rendering layer.
 */

/**
 * Fraction of the cell that is actually drawn. The remainder forms a
 * gutter between neighbours so individual bins stay distinguishable.
 */
export const HEX_INSET = 0.88;

/**
 * Circumradius of a hexagon, in screen pixels.
 *
 * Kept small so the bins read as discrete cells spread across the map
 * rather than large overlapping blobs.
 */
export const HEX_RADIUS_PX = 18;

/**
 * Fixed lattice origin. Keeping it constant means the bins never shift
 * when the viewport is panned.
 */
export const HEX_LATTICE_ORIGIN = { lat: 6, lng: 67 };

/** Dark-theme hex colours matching the crisis intensity legend. */
export const HEX_COLORS = {
  critical: { fill: "#dc2626", stroke: "#fecaca" },
  high: { fill: "#ea580c", stroke: "#fed7aa" },
  moderate: { fill: "#ca8a04", stroke: "#fef08a" },
  low: { fill: "#15803d", stroke: "#bbf7d0" },
};

/**
 * Hex colours for the active theme, derived from the ops design tokens.
 * Fill uses the semantic status colour; the stroke is a lightened/darkened
 * hairline so cell edges stay visible on both AMOLED and off-white maps.
 *
 * @param {"critical"|"high"|"moderate"|"low"} severity
 * @param {Record<string,string>} palette from services/theme.mapPalette()
 */
export function getHexColors(severity, palette) {
  const fill =
    {
      critical: palette?.crit,
      high: palette?.warn,
      moderate: palette?.moderate,
      low: palette?.safe,
    }[severity] || HEX_COLORS[severity].fill;

  return {
    fill,
    stroke: fill,
  };
}

/**
 * Heat layer geometry, scaled to the current zoom.
 *
 * The original radius/blur pair was tuned for a regional South India view.
 * At national zoom the same pixel radius merges every incident into a
 * single cloud, so both values scale with zoom to keep each hotspot
 * localised and legible at every scale.
 *
 * @param {number} zoom current map zoom
 */
export function getHeatScale(zoom) {
  // 26 px at zoom 5 (whole India) growing to 52 px at city level (z11+).
  const radius = Math.max(
    14,
    Math.min(52, Math.round(26 + (zoom - 5) * 3.2))
  );
  const blur = Math.max(
    10,
    Math.min(32, Math.round(radius * 0.62))
  );

  return { radius, blur };
}

export function getSeverity(priority) {
  if (priority >= 85) return "critical";
  if (priority >= 70) return "high";
  if (priority >= 50) return "moderate";
  return "low";
}

/**
 * Hexagon geometry for a given viewport.
 *
 * The radius is derived from a fixed pixel size so the bins stay small,
 * evenly spread and precisely clickable at every zoom level, while the
 * underlying geographic footprint scales naturally with the map.
 *
 * @param {number} centerLatitude latitude at the map centre
 * @param {number} zoom current map zoom
 * @returns {{rLat:number, rLng:number, dx:number, dy:number}}
 */
export function getHexMetrics(centerLatitude, zoom) {
  const latitudeRadians =
    (centerLatitude * Math.PI) / 180;

  const metersPerPixel =
    (156543.03392 * Math.cos(latitudeRadians)) /
    Math.pow(2, zoom);

  const radiusMeters = HEX_RADIUS_PX * metersPerPixel;

  const rLat = radiusMeters / 110574;
  const rLng =
    radiusMeters / (111320 * Math.cos(latitudeRadians));

  return {
    rLat,
    rLng,
    // Flat-to-flat spacing and row spacing of a pointy-top lattice.
    dx: Math.sqrt(3) * rLng,
    dy: 1.5 * rLat,
  };
}

/**
 * Vertices of a pointy-top hexagon in geographic coordinates.
 *
 * @param {{lat:number, lng:number}} center
 * @param {number} rLat vertical radius in degrees
 * @param {number} rLng horizontal radius in degrees
 * @returns {[number, number][]}
 */
export function hexVertices(center, rLat, rLng) {
  const points = [];

  for (let index = 0; index < 6; index += 1) {
    const angle =
      (Math.PI / 180) * (60 * index + 30);

    points.push([
      center.lat + rLat * Math.sin(angle),
      center.lng + rLng * Math.cos(angle),
    ]);
  }

  return points;
}

/**
 * Aggregate incidents into hexagonal bins.
 *
 * Intensity per bin blends the peak priority, the affected population and
 * the caseload, so heavily affected cells read darkest.
 *
 * @param {object[]} incidents
 * @param {{dx:number, dy:number}} metrics
 * @returns {object[]} occupied bins
 */
export function buildHexBins(incidents, metrics) {
  const { dx, dy } = metrics;
  const origin = HEX_LATTICE_ORIGIN;
  const bins = new Map();

  incidents.forEach((incident) => {
    const lat = Number(incident.latitude);
    const lng = Number(incident.longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    const row = Math.round((lat - origin.lat) / dy);

    // Odd rows are offset by half a hex to form the lattice.
    const shift = Math.abs(row) % 2 === 1 ? dx / 2 : 0;

    const col = Math.round(
      (lng - shift - origin.lng) / dx
    );

    const key = `${col}:${row}`;

    if (!bins.has(key)) {
      bins.set(key, {
        key,
        center: {
          lat: origin.lat + row * dy,
          lng: origin.lng + col * dx + shift,
        },
        incidents: [],
        people: 0,
        peakPriority: 0,
        priorityTotal: 0,
      });
    }

    const bin = bins.get(key);
    const priority = Number(incident.priority || 0);

    bin.incidents.push(incident);
    bin.people += Number(incident.people || 0);
    bin.priorityTotal += priority;
    bin.peakPriority = Math.max(
      bin.peakPriority,
      priority
    );
  });

  return [...bins.values()].map((bin) => {
    const meanPriority =
      bin.priorityTotal / bin.incidents.length;

    const severity = getSeverity(bin.peakPriority);

    const peopleFactor = Math.min(bin.people / 60, 1);
    const caseloadFactor = Math.min(
      bin.incidents.length / 3,
      1
    );

    return {
      ...bin,
      severity,
      meanPriority,
      intensity: Math.min(
        Math.max(
          (bin.peakPriority / 100) * 0.7 +
            peopleFactor * 0.2 +
            caseloadFactor * 0.1,
          0.2
        ),
        0.92
      ),
    };
  });
}