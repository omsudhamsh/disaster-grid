import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { apiGet } from "../services/api";
import { mapPalette, useTheme } from "../services/theme";
import {
  INDIA_CENTER,
  INDIA_ZOOM,
  INDIA_BOUNDS,
  WORLD_OUTLINE,
  INDIA_MAINLAND,
  INDIA_ISLANDS,
  TERRITORY_RINGS,
  isInsideIndia,
} from "../utils/geo.js";
import {
  HEX_INSET,
  getSeverity,
  getHexMetrics,
  hexVertices,
  buildHexBins,
  getHeatScale,
  getHexColors,
} from "../utils/hexbin.js";

/*
 * ==================================================
 * BASEMAPS
 * ==================================================
 *
 * OPS GRID: Esri World Gray canvases — a cartographer-grade basemap
 * pair that follows the active theme (Dark Gray on AMOLED, Light Gray
 * on the off-white mode), with matching reference-label overlays.
 *
 * NASA SATELLITE: NASA GIBS daily true-colour mosaic (VIIRS SNPP),
 * the previous day's global composite.
 */
const OPS_BASEMAP_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";

const OPS_LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

const LIGHT_BASEMAP_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

const LIGHT_LABELS_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

const OPS_ATTRIBUTION =
  "Basemap &copy; Esri · Boundaries &copy; <a href=\"https://naturalearthdata.com/\">Natural Earth</a>";

function gibsDate() {
  const date = new Date(Date.now() - 24 * 3600 * 1000);
  return date.toISOString().slice(0, 10);
}

const NASA_ATTRIBUTION =
  'Imagery <a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> (VIIRS SNPP true colour, ' +
  gibsDate() +
  ") · Boundaries &copy; Natural Earth";

const VIEW_HEAT = "heat";
const VIEW_HEX = "hex";
const VIEW_MARKERS = "markers";

const BASEMAP_OPS = "ops";
const BASEMAP_NASA = "nasa";

/*
 * Popup placement: Leaflet auto-flips vertically and auto-pans by default;
 * we add generous padding so popups near any edge stay fully visible. A
 * popupopen handler below nudges the map when a popup would spill past the
 * right/bottom bounds (auto-flip in every direction).
 */
const POPUP_OPTIONS = {
  autoPan: true,
  autoPanPaddingTopLeft: [56, 56],
  autoPanPaddingBottomRight: [56, 56],
};

function getHeatConfig(severity, isLight = false) {
  const darkConfigs = {
    critical: {
      radius: 52,
      blur: 32,
      minOpacity: 0.45,
      gradient: {
        0.15: "#fecaca",
        0.35: "#f87171",
        0.55: "#ef4444",
        0.75: "#dc2626",
        1.0: "#991b1b",
      },
    },
    high: {
      radius: 46,
      blur: 30,
      minOpacity: 0.38,
      gradient: {
        0.15: "#fed7aa",
        0.35: "#fdba74",
        0.55: "#fb923c",
        0.75: "#f97316",
        1.0: "#c2410c",
      },
    },
    moderate: {
      radius: 40,
      blur: 27,
      minOpacity: 0.32,
      gradient: {
        0.15: "#fef9c3",
        0.35: "#fde68a",
        0.55: "#facc15",
        0.75: "#eab308",
        1.0: "#a16207",
      },
    },
    low: {
      radius: 34,
      blur: 24,
      minOpacity: 0.25,
      gradient: {
        0.15: "#dbeafe",
        0.35: "#93c5fd",
        0.55: "#4ade80",
        0.75: "#22c55e",
        1.0: "#15803d",
      },
    },
  };

  /* Light basemap: pastel heat ramps wash out, so every ramp starts
     from a deeper, higher-contrast anchor. */
  const lightConfigs = {
    critical: darkConfigs.critical,
    high: darkConfigs.high,
    moderate: {
      ...darkConfigs.moderate,
      gradient: {
        0.15: "#fde047",
        0.35: "#facc15",
        0.55: "#eab308",
        0.75: "#ca8a04",
        1.0: "#854d0e",
      },
    },
    low: {
      radius: 34,
      blur: 24,
      minOpacity: 0.25,
      gradient: {
        0.15: "#bfdbfe",
        0.35: "#60a5fa",
        0.55: "#2dd4bf",
        0.75: "#059669",
        1.0: "#047857",
      },
    },
  };

  return (isLight ? lightConfigs : darkConfigs)[severity];
}

function distanceKm(pointA, pointB) {
  const R = 6371;
  const lat1 = (pointA.lat * Math.PI) / 180;
  const lat2 = (pointB.lat * Math.PI) / 180;
  const dLat = ((pointB.lat - pointA.lat) * Math.PI) / 180;
  const dLng = ((pointB.lng - pointA.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* Keep only incidents with usable coordinates that fall inside India. */
function getIndianIncidents(incidents) {
  return incidents.filter((incident) =>
    isInsideIndia(Number(incident.latitude), Number(incident.longitude))
  );
}

/*
 * Group incidents only when they share severity AND are geographically
 * close — different severity levels are never merged.
 */
function createClusters(incidents) {
  const clusters = [];
  const grouped = { critical: [], high: [], moderate: [], low: [] };

  incidents.forEach((incident) => {
    const lat = Number(incident.latitude);
    const lng = Number(incident.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const priority = Number(incident.priority || 0);
    const people = Number(incident.people || 0);
    const severity = getSeverity(priority);
    grouped[severity].push({ ...incident, lat, lng, priority, people, severity });
  });

  Object.entries(grouped).forEach(([, items]) => {
    items.forEach((incident) => {
      let existingCluster = null;
      for (const cluster of clusters) {
        if (cluster.severity !== incident.severity) continue;
        if (distanceKm({ lat: incident.lat, lng: incident.lng }, cluster) <= 1.5) {
          existingCluster = cluster;
          break;
        }
      }

      if (existingCluster) {
        existingCluster.incidents.push(incident);
        const count = existingCluster.incidents.length;
        existingCluster.lat =
          (existingCluster.lat * (count - 1) + incident.lat) / count;
        existingCluster.lng =
          (existingCluster.lng * (count - 1) + incident.lng) / count;
        existingCluster.priority = Math.max(existingCluster.priority, incident.priority);
        existingCluster.people += incident.people;
      } else {
        clusters.push({
          severity: incident.severity,
          lat: incident.lat,
          lng: incident.lng,
          priority: incident.priority,
          people: incident.people,
          incidents: [incident],
        });
      }
    });
  });

  return clusters;
}

function incidentPopup(incident) {
  const timeLabel = incident.time
    ? String(incident.time).replace("T", " ").slice(0, 16) + " UTC"
    : "Unknown";
  return `
    <div style="min-width:250px">
      <div class="map-pop__eyebrow">
        ${incident.source || "LIVE FEED"} · ${incident.id || ""}
      </div>
      <div class="map-pop__title">
        ${incident.location || "Unknown location"}
      </div>
      <div class="map-pop__body">
        <div><strong>State:</strong> ${incident.state || "India"}</div>
        <div><strong>Disaster:</strong> ${incident.type || "Unknown"}</div>
        <div><strong>Urgency:</strong> ${incident.urgency || "Unknown"}</div>
        <div><strong>Priority:</strong> ${incident.priority ?? "-"}/100</div>
        <div><strong>People affected:</strong> ${incident.people ?? 0}</div>
        <div><strong>Required aid:</strong> ${incident.aid || "General assistance"}</div>
        <div><strong>Reported:</strong> ${timeLabel}</div>
        ${incident.magnitude ? `<div><strong>Measure:</strong> ${incident.magnitude}</div>` : ""}
        <div><strong>Coordinates:</strong> ${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}</div>
      </div>
      ${
        incident.source_url
          ? `<a href="${incident.source_url}" target="_blank" rel="noreferrer noopener" class="map-pop__link">View source report ↗</a>`
          : ""
      }
      <button
        type="button"
        class="map-pop__dispatch"
        data-dispatch-incident="${incident.id || ""}"
      >
        REQUEST RESCUE DISPATCH
      </button>
    </div>
  `;
}

function hexPopup(bin) {
  const rows = bin.incidents
    .slice(0, 4)
    .map((incident) => incidentPopup(incident))
    .join("");

  return `
    <div style="min-width:250px">
      <div class="map-pop__eyebrow">
        HEXBIN ${bin.key.toUpperCase()}
      </div>
      <div class="map-pop__title">
        ${bin.severity.charAt(0).toUpperCase() + bin.severity.slice(1)} Density Cell
      </div>
      <div class="map-pop__body">
        <div><strong>Incidents:</strong> ${bin.incidents.length}</div>
        <div><strong>People affected:</strong> ${bin.people}</div>
        <div><strong>Peak priority:</strong> ${bin.peakPriority}/100</div>
        <div><strong>Mean priority:</strong> ${Math.round(bin.meanPriority)}/100</div>
        <div><strong>Centroid:</strong> ${bin.center.lat.toFixed(3)}N, ${bin.center.lng.toFixed(3)}E</div>
      </div>
      ${rows}
    </div>
  `;
}

function DisasterMap({ userPosition, safetyVerdict, onDispatchRequest }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatLayersRef = useRef([]);
  const hexLayersRef = useRef([]);
  const markerLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const onDispatchRef = useRef(onDispatchRequest);
  const maskRef = useRef(null);
  const outlineRef = useRef(null);

  // Theme-reactive palette: every Leaflet SVG color derives from the
  // active theme's CSS tokens, so dark AMOLED and light modes both read
  // natively without hardcoded hexes.
  const theme = useTheme();
  // Re-computed on every render of this component — it is a single
  // getComputedStyle call and re-reads the live tokens whenever the
  // theme flips.
  const palette = mapPalette();

  const [incidents, setIncidents] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [viewMode, setViewMode] = useState(VIEW_HEAT);
  const [basemap, setBasemap] = useState(BASEMAP_OPS);
  const [zoomLevel, setZoomLevel] = useState(INDIA_ZOOM);
  const [updatedAt, setUpdatedAt] = useState("");
  const [syncing, setSyncing] = useState(true);

  const severityColors = useMemo(
    () => ({
      critical: palette.crit,
      high: palette.warn,
      moderate: palette.moderate,
      low: palette.accent,
    }),
    [palette]
  );

  // Keep the Leaflet event handlers reading the latest callback without
  // re-binding layers on every parent render.
  useEffect(() => {
    onDispatchRef.current = onDispatchRequest;
  }, [onDispatchRequest]);

  // ==================================================
  // LOAD LIVE INCIDENTS (NASA / USGS / GDACS + reports)
  // ==================================================

  useEffect(() => {
    let active = true;

    const load = () => {
      apiGet("/api/incidents/")
        .then((data) => {
          if (!active) return;
          setIncidents(getIndianIncidents(data.incidents || []));
          setUpdatedAt(data.generated_at || "");
          setLoadError("");
          setSyncing(false);
        })
        .catch(() => {
          if (active) {
            setLoadError("Live incident feed unavailable");
            setSyncing(false);
          }
        });
    };

    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // ==================================================
  // AUTO-FIT BOUNDS TO DATA
  // ==================================================

  const hasFitted = useRef(false);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !incidents.length || hasFitted.current) return;

    const points = incidents
      .map((incident) => [Number(incident.latitude), Number(incident.longitude)])
      .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));

    if (points.length === 0) return;

    hasFitted.current = true;
    map.fitBounds(L.latLngBounds(points).pad(0.15), { maxZoom: 7, padding: [32, 32] });
  }, [incidents]);

  // ==================================================
  // CREATE MAP
  // ==================================================

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      worldCopyJump: true,
      // Smooth, cinematic pan/zoom: sub-step zoom levels + animation.
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      inertia: true,
      inertiaDeceleration: 2400,
    }).setView(INDIA_CENTER, INDIA_ZOOM);

    map.setMaxBounds(INDIA_BOUNDS);
    map.options.maxBoundsViscosity = 0.8;

    L.tileLayer(OPS_BASEMAP_URL, {
      attribution: OPS_ATTRIBUTION,
      maxZoom: 16,
      className: "disaster-basemap",
    }).addTo(map);

    L.tileLayer(OPS_LABELS_URL, {
      maxZoom: 16,
      opacity: 0.9,
      className: "disaster-basemap",
      interactive: false,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ position: "bottomleft", metric: true, imperial: false }).addTo(map);

    /*
     * Pan India boundary constraint.
     * Pane stacking (low to high):
     *   200 tilePane          basemap
     *   350 restrictedPane    neighbour dimming mask
     *   420 hexbinPane        hexagonal density cells
     *   heat / markers        crisis hotspots
     */
    map.createPane("restrictedPane");
    map.getPane("restrictedPane").style.zIndex = 350;
    map.getPane("restrictedPane").style.pointerEvents = "none";

    map.createPane("hexbinPane");
    map.getPane("hexbinPane").style.zIndex = 420;

    const indiaHoles = [INDIA_MAINLAND, ...INDIA_ISLANDS, ...TERRITORY_RINGS];

    // Neighbour-dimming mask, theme-aware via the palette token.
    maskRef.current = L.polygon([WORLD_OUTLINE, ...indiaHoles], {
      pane: "restrictedPane",
      stroke: false,
      fill: true,
      fillColor: palette.bg,
      fillOpacity: 0.45,
      interactive: false,
    }).addTo(map);

    outlineRef.current = indiaHoles.map((ring) =>
      L.polygon(ring, {
        pane: "restrictedPane",
        color: palette.accent,
        weight: 1.2,
        opacity: 0.5,
        fill: false,
        interactive: false,
      }).addTo(map)
    );

    mapInstance.current = map;

    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      map.remove();
      mapInstance.current = null;
      maskRef.current = null;
      outlineRef.current = null;
    };
    // incidents intentionally omitted: popup lookup uses the latest ref below.
    // Palette is read once at mount; theme flips restyle via refs in the
    // effect below, so re-creating the map is never needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restyle the boundary mask + outline when the theme flips.
  useEffect(() => {
    if (maskRef.current) maskRef.current.setStyle({ fillColor: palette.bg });
    if (outlineRef.current) {
      outlineRef.current.forEach((layer) =>
        layer.setStyle({ color: palette.accent })
      );
    }
  }, [palette, palette.bg, palette.accent]);

  // Keep a live copy of incidents for popup handlers.
  const incidentsRef = useRef(incidents);
  useEffect(() => {
    incidentsRef.current = incidents;
  }, [incidents]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Hexbin popups nest several incident blocks, each with its own
    // dispatch button — wire every one of them, not just the first.
    const handler = (event) => {
      const node = event.popup.getElement();
      if (!node) return;

      node.querySelectorAll("[data-dispatch-incident]").forEach((button) => {
        if (button.dataset.dgWired === "true") return;
        button.dataset.dgWired = "true";

        button.addEventListener("click", () => {
          const incidentId = button.getAttribute("data-dispatch-incident");
          const incident = incidentsRef.current.find(
            (item) => (item.id || "") === incidentId
          );
          if (incident && onDispatchRef.current) onDispatchRef.current(incident);
        });
      });
    };

    map.on("popupopen", handler);
    return () => map.off("popupopen", handler);
  }, []);

  // Keep every popup fully inside the map viewport. Leaflet flips
  // vertically and auto-pans, but when a popup is opened near the
  // right/bottom edge we nudge the map so it never gets clipped.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const keepPopupInView = (event) => {
      const popup = event.popup;
      const node = popup.getElement();
      const container = map.getContainer();
      if (!node || !container) return;

      requestAnimationFrame(() => {
        const mapRect = container.getBoundingClientRect();
        const popupRect = node.getBoundingClientRect();

        let overflowX = 0;
        let overflowY = 0;
        if (popupRect.right > mapRect.right) overflowX = popupRect.right - mapRect.right;
        if (popupRect.left < mapRect.left) overflowX = popupRect.left - mapRect.left;
        if (popupRect.bottom > mapRect.bottom) overflowY = popupRect.bottom - mapRect.bottom;
        if (popupRect.top < mapRect.top) overflowY = popupRect.top - mapRect.top;

        if (overflowX || overflowY) {
          map.panBy(L.point(overflowX, overflowY), {
            animate: true,
            duration: 0.3,
            easeLinearity: 0.25,
          });
        }
      });
    };

    map.on("popupopen", keepPopupInView);
    return () => map.off("popupopen", keepPopupInView);
  }, []);

  // ==================================================
  // BASEMAP SWITCH (follows the active theme + user choice)
  // ==================================================

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    const light = theme === "light";

    if (basemap === BASEMAP_NASA) {
      L.tileLayer(
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${gibsDate()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        {
          attribution: NASA_ATTRIBUTION,
          maxZoom: 14,
          maxNativeZoom: 9,
          className: "satellite-basemap",
          crossOrigin: true,
        }
      ).addTo(map);
    } else {
      L.tileLayer(light ? LIGHT_BASEMAP_URL : OPS_BASEMAP_URL, {
        attribution: OPS_ATTRIBUTION,
        maxZoom: 16,
        className: "disaster-basemap",
      }).addTo(map);
    }

    // City/village reference labels stay readable over both basemaps.
    L.tileLayer(light ? LIGHT_LABELS_URL : OPS_LABELS_URL, {
      maxZoom: 16,
      opacity: 0.9,
      className: "disaster-basemap",
      interactive: false,
    }).addTo(map);
  }, [basemap, theme]);

  // ==================================================
  // USER LOCATION: dot + accuracy + 10 km safety ring
  // ==================================================

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Re-create the layer each run so StrictMode remounts never leave the
    // group bound to a discarded map instance.
    if (userLayerRef.current) {
      map.removeLayer(userLayerRef.current);
    }
    const layer = L.layerGroup().addTo(map);
    userLayerRef.current = layer;
    layer.clearLayers();

    if (!userPosition) return;

    const { latitude, longitude, accuracy } = userPosition;

    // Accuracy halo, like Google Maps' blue uncertainty circle.
    if (Number.isFinite(accuracy) && accuracy > 0) {
      L.circle([latitude, longitude], {
        radius: Math.min(accuracy, 500),
        color: palette.accent,
        weight: 1,
        opacity: 0.35,
        fillColor: palette.accent,
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(layer);
    }

    // 10 km safety ring coloured by the live verdict.
    const ringColor =
      safetyVerdict === "danger"
        ? palette.crit
        : safetyVerdict === "caution"
          ? palette.warn
          : palette.safe;

    L.circle([latitude, longitude], {
      radius: 10000,
      color: ringColor,
      weight: 1.5,
      dashArray: "6 6",
      opacity: 0.75,
      fillColor: ringColor,
      fillOpacity: 0.05,
    })
      .bindPopup(
        `<div style="min-width:230px">
          <div class="map-pop__eyebrow">SAFETY RADIUS · 10 KM</div>
          <div class="map-pop__title">${
            safetyVerdict === "danger"
              ? "Crisis zone within your radius"
              : safetyVerdict === "caution"
                ? "Threat close to your position"
                : "No reported events in your radius"
          }</div>
          <div class="map-pop__body">
            The dashed circle is your 10 km safety check against the live grid.
            It refreshes with the incident feed.
          </div>
        </div>`,
        POPUP_OPTIONS
      )
      .addTo(layer);

    // Position dot.
    const dot = L.divIcon({
      className: "user-location-dot-wrapper",
      html: `<div class="user-location-dot"><div class="user-location-dot__halo"></div><div class="user-location-dot__core"></div></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([latitude, longitude], {
      icon: dot,
      interactive: true,
      keyboard: false,
      zIndexOffset: 1000,
    })
      .bindPopup(
        `<div style="min-width:210px">
          <div class="map-pop__eyebrow">YOUR POSITION</div>
          <div class="map-pop__title">Live GPS fix</div>
          <div class="map-pop__body">
            <div><strong>Latitude:</strong> ${latitude.toFixed(5)}</div>
            <div><strong>Longitude:</strong> ${longitude.toFixed(5)}</div>
            <div><strong>Accuracy:</strong> ±${Math.round(accuracy || 0)} m</div>
          </div>
        </div>`,
        POPUP_OPTIONS
      )
      .addTo(layer);
  }, [userPosition, safetyVerdict, palette]);

  // ==================================================
  // BUILD SEPARATED HEATMAPS
  // ==================================================

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || viewMode !== VIEW_HEAT) return;

    heatLayersRef.current.forEach((layer) => map.removeLayer(layer));
    heatLayersRef.current = [];

    if (!incidents.length) return;

    const clusters = createClusters(incidents);
    const severityGroups = { critical: [], high: [], moderate: [], low: [] };

    clusters.forEach((cluster) => {
      const priorityFactor = cluster.priority / 100;
      const peopleFactor = Math.min(cluster.people / 50, 1);
      const clusterFactor = Math.min(cluster.incidents.length / 3, 1);
      const intensity =
        priorityFactor * 0.65 + peopleFactor * 0.2 + clusterFactor * 0.15;

      severityGroups[cluster.severity].push([
        cluster.lat,
        cluster.lng,
        Math.max(Math.min(intensity, 1), 0.35),
      ]);
    });

    Object.entries(severityGroups).forEach(([severity, points]) => {
      if (!points.length) return;

      const config = getHeatConfig(severity, theme === "light");
      const { radius, blur } = getHeatScale(map.getZoom());

      const layer = L.heatLayer(points, {
        radius,
        blur,
        maxZoom: 11,
        minOpacity: config.minOpacity,
        max: 1,
        gradient: config.gradient,
      });

      layer.addTo(map);
      heatLayersRef.current.push(layer);
    });

    return () => {
      heatLayersRef.current.forEach((layer) => map.removeLayer(layer));
      heatLayersRef.current = [];
    };
  }, [incidents, viewMode, zoomLevel, theme]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const onZoomEnd = () => setZoomLevel(map.getZoom());
    map.on("zoomend", onZoomEnd);
    return () => map.off("zoomend", onZoomEnd);
  }, []);

  // ==================================================
  // BUILD HEXAGONAL BINS
  // ==================================================

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || viewMode !== VIEW_HEX) return;

    let frame = null;

    const clear = () => {
      hexLayersRef.current.forEach((layer) => map.removeLayer(layer));
      hexLayersRef.current = [];
    };

    const render = () => {
      clear();
      if (!incidents.length) return;

      const metrics = getHexMetrics(map.getCenter().lat, map.getZoom());
      const bins = buildHexBins(incidents, metrics);

      bins.forEach((bin) => {
        const colors = getHexColors(bin.severity, palette);
        const hexagon = L.polygon(
          hexVertices(
            bin.center,
            metrics.rLat * HEX_INSET,
            metrics.rLng * HEX_INSET
          ),
          {
            pane: "hexbinPane",
            color: colors.stroke,
            weight: 1,
            opacity: 0.75,
            fillColor: colors.fill,
            fillOpacity: bin.intensity,
          }
        );

        hexagon.bindPopup(hexPopup(bin), POPUP_OPTIONS);
        hexagon.addTo(map);
        hexLayersRef.current.push(hexagon);
      });
    };

    render();

    const onViewportChange = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    };

    map.on("zoomend", onViewportChange);
    map.on("moveend", onViewportChange);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      map.off("zoomend", onViewportChange);
      map.off("moveend", onViewportChange);
      clear();
    };
  }, [incidents, viewMode, palette]);

  // ==================================================
  // OPERATIONAL MARKERS
  // ==================================================

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || viewMode !== VIEW_MARKERS) return;

    // Drop any group left over from a previous map instance.
    if (markerLayerRef.current) {
      map.removeLayer(markerLayerRef.current);
      markerLayerRef.current = null;
    }
    const layer = L.layerGroup().addTo(map);
    markerLayerRef.current = layer;
    layer.clearLayers();

    clustersForMarkers(incidents).forEach((cluster) => {
      const color = severityColors[cluster.severity] || severityColors.low;
      const isCritical = cluster.severity === "critical";

      cluster.incidents.forEach((incident) => {
        const baseRadius = isCritical ? 9 : 7;
        const marker = L.circleMarker([incident.lat, incident.lng], {
          radius: baseRadius,
          color: palette.bg,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.95,
          className: isCritical ? "critical-pulse" : undefined,
        });

        // Hover feedback: markers grow and thicken under the cursor.
        marker.on("mouseover", () => {
          marker.setStyle({ radius: baseRadius + 2.5, weight: 3 });
        });
        marker.on("mouseout", () => {
          marker.setStyle({ radius: baseRadius, weight: 2 });
        });

        marker.bindPopup(incidentPopup(incident), POPUP_OPTIONS);
        marker.bindTooltip(
          `${incident.location} · ${incident.type}`,
          { direction: "top", offset: [0, -8], opacity: 0.95 }
        );
        marker.addTo(layer);
      });
    });

    return () => {
      layer.clearLayers();
    };
  }, [incidents, viewMode, palette, severityColors]);

  // ==================================================
  // CLICK INFORMATION (heat view)
  // ==================================================

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || viewMode !== VIEW_HEAT) return;

    const clusters = createClusters(incidents);
    const popupLayers = [];
    const hitRadius = Math.max(400, Math.round(600 * Math.pow(2, 5 - map.getZoom())));

    clusters.forEach((cluster) => {
      const interaction = L.circle([cluster.lat, cluster.lng], {
        radius: hitRadius,
        stroke: false,
        fillOpacity: 0,
      });

      let content = `
        <div style="min-width:240px">
          <div class="map-pop__eyebrow">CRISIS ZONE</div>
          <div class="map-pop__title">
            ${cluster.severity.charAt(0).toUpperCase() + cluster.severity.slice(1)} Priority Zone
          </div>
          <div class="map-pop__body">
            <div><strong>Incidents:</strong> ${cluster.incidents.length}</div>
            <div><strong>People affected:</strong> ${cluster.people}</div>
            <div><strong>Highest priority:</strong> ${cluster.priority}/100</div>
          </div>
      `;

      cluster.incidents.forEach((incident) => {
        content += incidentPopup(incident);
      });

      content += `</div>`;

      interaction.addTo(map).bindPopup(content, POPUP_OPTIONS);
      popupLayers.push(interaction);
    });

    return () => {
      popupLayers.forEach((layer) => map.removeLayer(layer));
    };
  }, [incidents, viewMode]);

  // ==================================================
  // UI
  // ==================================================

  const criticalCount = useMemo(
    () => incidents.filter((incident) => (incident.priority || 0) >= 85).length,
    [incidents]
  );

  return (
    <div className="relative h-full min-h-[500px] overflow-hidden">
      <div
        ref={mapRef}
        style={{ width: "100%", height: "100%", minHeight: "500px" }}
      />

      {/* LAYER + VIEW CONTROLS — floating glass chips */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
        <div
          role="group"
          aria-label="Map view mode"
          className="glass-chip flex items-center gap-1 rounded-lg p-1 shadow-lg"
        >
          {[
            [VIEW_HEAT, "HEAT"],
            [VIEW_HEX, "HEXBIN"],
            [VIEW_MARKERS, "UNITS"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`shrink-0 cursor-pointer rounded-md px-3 py-1.5 font-mono text-[10px] font-bold tracking-wide transition-all duration-150 active:scale-95 ${
                viewMode === mode
                  ? "bg-[var(--color-ops-accent)] text-[var(--color-ops-accent-contrast)]"
                  : "text-[var(--color-ops-secondary)] hover:bg-[var(--color-ops-overlay)] hover:text-[var(--color-ops-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Basemap"
          className="glass-chip flex items-center gap-1 rounded-lg p-1 shadow-lg"
        >
          {[
            [BASEMAP_OPS, "OPS GRID"],
            [BASEMAP_NASA, "SATELLITE"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setBasemap(mode)}
              aria-pressed={basemap === mode}
              className={`shrink-0 rounded px-3 py-1.5 font-mono text-[10px] font-bold tracking-wide transition-all duration-150 active:scale-95 ${
                basemap === mode
                  ? "bg-[var(--color-ops-raised)] text-[var(--color-ops-text)] shadow-[inset_0_0_0_1px_var(--color-ops-line-strong)]"
                  : "text-[var(--color-ops-secondary)] hover:text-[var(--color-ops-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* STATUS */}
      <div className="glass-chip absolute left-3 top-3 z-[1000] rounded-lg px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="live-dot live-dot--live" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-wide text-[var(--color-ops-text)]">
            LIVE INCIDENT GRID
          </span>
        </div>
        <div className="mt-1 text-xs text-[var(--color-ops-secondary)]">
          {loadError || (
            syncing ? (
              <div className="flex items-center gap-2">
                <span className="skeleton inline-block h-2.5 w-24 rounded-full" />
                <span className="text-[10px] text-[var(--color-ops-muted)]">syncing live grid…</span>
              </div>
            ) : (
              <>
                {incidents.length} live events ·{" "}
                <span className="text-[var(--color-ops-crit)]">{criticalCount} critical</span>
                {updatedAt && (
                  <span className="font-mono text-[10px] text-[var(--color-ops-muted)]">
                    {" "}
                    · synced {new Date(updatedAt).toLocaleTimeString()}
                  </span>
                )}
              </>
            )
          )}
        </div>
        <div className="mt-0.5 font-mono text-[9px] tracking-wide text-[var(--color-ops-muted)]">
          SOURCES: SATELLITE · SEISMIC · ALERT · FIELD FEEDS
        </div>
      </div>

      {/* LEGEND — sits above the scale control */}
      <div className="glass-chip absolute bottom-10 left-3 z-[1000] hidden rounded-lg p-3 shadow-lg sm:block">
        <p className="eyebrow mb-2">Crisis Intensity</p>
        <Legend color={severityColors.critical} label="Critical · 85+" />
        <Legend color={severityColors.high} label="High · 70+" />
        <Legend color={severityColors.moderate} label="Moderate · 50+" />
        <Legend color={severityColors.low} label="Low · < 50" />
        <div className="mt-2 flex items-center gap-2 border-t border-[var(--color-ops-line)] pt-2">
          <span className="relative inline-flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-ops-accent)] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-[var(--color-ops-dot-ring)] bg-[var(--color-ops-accent)]" />
          </span>
          <span className="text-[10px] text-[var(--color-ops-secondary)]">
            Your position · 10 km safety ring
          </span>
        </div>
      </div>
    </div>
  );
}

function clustersForMarkers(incidents) {
  const grouped = { critical: [], high: [], moderate: [], low: [] };
  incidents.forEach((incident) => {
    const lat = Number(incident.latitude);
    const lng = Number(incident.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const priority = Number(incident.priority || 0);
    const severity = getSeverity(priority);
    grouped[severity].push({ ...incident, lat, lng, severity });
  });
  return Object.entries(grouped).map(([severity, items]) => ({ severity, incidents: items }));
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span
        className="h-2.5 w-6 rounded-full"
        style={{ background: color, opacity: 0.85 }}
      />
      <span className="text-[11px] text-[var(--color-ops-secondary)]">{label}</span>
    </div>
  );
}

export default DisasterMap;
