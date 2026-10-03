import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const HYDERABAD_CENTER = [17.405, 78.48];

function getSeverity(priority) {
  if (priority >= 85) return "critical";
  if (priority >= 70) return "high";
  if (priority >= 50) return "moderate";
  return "low";
}

function getHeatConfig(severity) {
  const configs = {
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

  return configs[severity];
}

/*
 * Distance between two latitude/longitude points.
 * Returns approximate distance in kilometres.
 */
function distanceKm(pointA, pointB) {
  const R = 6371;

  const lat1 = (pointA.lat * Math.PI) / 180;
  const lat2 = (pointB.lat * Math.PI) / 180;

  const dLat =
    ((pointB.lat - pointA.lat) * Math.PI) / 180;

  const dLng =
    ((pointB.lng - pointA.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/*
 * Group incidents only when:
 *
 * 1. They have the SAME severity
 * 2. They are geographically close
 *
 * Different severity levels are NEVER merged.
 */
function createClusters(incidents) {
  const clusters = [];

  const grouped = {
    critical: [],
    high: [],
    moderate: [],
    low: [],
  };

  incidents.forEach((incident) => {
    const lat = Number(incident.latitude);
    const lng = Number(incident.longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    const priority = Number(
      incident.priority || 0
    );

    const people = Number(
      incident.people || 0
    );

    const severity = getSeverity(priority);

    grouped[severity].push({
      ...incident,
      lat,
      lng,
      priority,
      people,
      severity,
    });
  });

  Object.entries(grouped).forEach(
    ([severity, items]) => {
      items.forEach((incident) => {
        let existingCluster = null;

        for (const cluster of clusters) {
          if (cluster.severity !== severity) {
            continue;
          }

          const distance = distanceKm(
            {
              lat: incident.lat,
              lng: incident.lng,
            },
            {
              lat: cluster.lat,
              lng: cluster.lng,
            }
          );

          /*
           * Only merge same-severity incidents
           * within approximately 1.5 km.
           */
          if (distance <= 1.5) {
            existingCluster = cluster;
            break;
          }
        }

        if (existingCluster) {
          existingCluster.incidents.push(
            incident
          );

          const count =
            existingCluster.incidents.length;

          existingCluster.lat =
            (existingCluster.lat * (count - 1) +
              incident.lat) /
            count;

          existingCluster.lng =
            (existingCluster.lng * (count - 1) +
              incident.lng) /
            count;

          existingCluster.priority = Math.max(
            existingCluster.priority,
            incident.priority
          );

          existingCluster.people +=
            incident.people;
        } else {
          clusters.push({
            severity,
            lat: incident.lat,
            lng: incident.lng,
            priority: incident.priority,
            people: incident.people,
            incidents: [incident],
          });
        }
      });
    }
  );

  return clusters;
}

function DisasterMap() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatLayersRef = useRef([]);

  const [incidents, setIncidents] = useState([]);

  // ==================================================
  // LOAD INCIDENTS
  // ==================================================

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/incidents/")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch incidents");
        }

        return response.json();
      })
      .then((data) => {
        setIncidents(data.incidents || []);
      })
      .catch((error) => {
        console.error(
          "Failed to load incidents:",
          error
        );
      });
  }, []);

  // ==================================================
  // CREATE MAP
  // ==================================================

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) {
      return;
    }

    const map = L.map(mapRef.current).setView(
      HYDERABAD_CENTER,
      11
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }
    ).addTo(map);

    mapInstance.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // ==================================================
  // BUILD SEPARATED HEATMAPS
  // ==================================================

  useEffect(() => {
    const map = mapInstance.current;

    if (!map) {
      return;
    }

    // Remove old heat layers
    heatLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });

    heatLayersRef.current = [];

    if (!incidents.length) {
      return;
    }

    // Create geographically separated clusters
    const clusters =
      createClusters(incidents);

    const severityGroups = {
      critical: [],
      high: [],
      moderate: [],
      low: [],
    };

    clusters.forEach((cluster) => {
      /*
       * Priority is the main intensity factor.
       * Number of people slightly increases it.
       */
      const priorityFactor =
        cluster.priority / 100;

      const peopleFactor =
        Math.min(cluster.people / 50, 1);

      const clusterFactor =
        Math.min(
          cluster.incidents.length / 3,
          1
        );

      const intensity =
        priorityFactor * 0.65 +
        peopleFactor * 0.2 +
        clusterFactor * 0.15;

      severityGroups[
        cluster.severity
      ].push([
        cluster.lat,
        cluster.lng,
        Math.max(
          Math.min(intensity, 1),
          0.35
        ),
      ]);
    });

    // ==================================================
    // ADD EACH SEVERITY SEPARATELY
    // ==================================================

    Object.entries(severityGroups).forEach(
      ([severity, points]) => {
        if (!points.length) {
          return;
        }

        const config =
          getHeatConfig(severity);

        const layer = L.heatLayer(
          points,
          {
            radius: config.radius,
            blur: config.blur,

            /*
             * Keeps hotspots visible at the
             * city-level view.
             */
            maxZoom: 11,

            minOpacity:
              config.minOpacity,

            max: 1,

            gradient:
              config.gradient,
          }
        );

        layer.addTo(map);

        heatLayersRef.current.push(layer);
      }
    );

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      heatLayersRef.current.forEach(
        (layer) => {
          map.removeLayer(layer);
        }
      );

      heatLayersRef.current = [];
    };
  }, [incidents]);

  // ==================================================
  // CLICK INFORMATION
  // ==================================================

  useEffect(() => {
    const map = mapInstance.current;

    if (!map) {
      return;
    }

    const clusters =
      createClusters(incidents);

    const popupLayers = [];

    clusters.forEach((cluster) => {
      const config =
        getHeatConfig(
          cluster.severity
        );

      /*
       * Invisible interaction area.
       * No visible dot is rendered.
       */
      const interaction =
        L.circle(
          [cluster.lat, cluster.lng],
          {
            radius: 900,
            stroke: false,
            fillOpacity: 0,
          }
        );

      let content = `
        <div
          style="
            min-width:240px;
            font-family:Arial,sans-serif;
          "
        >

          <div
            style="
              font-size:11px;
              color:#64748b;
              margin-bottom:4px;
            "
          >
            CRISIS ZONE
          </div>

          <div
            style="
              font-size:18px;
              font-weight:700;
              margin-bottom:8px;
              color:#0f172a;
            "
          >
            ${cluster.severity
              .charAt(0)
              .toUpperCase() +
              cluster.severity.slice(1)}
            Priority Zone
          </div>

          <div
            style="
              font-size:13px;
              color:#475569;
              line-height:1.8;
              border-top:1px solid #e2e8f0;
              padding-top:8px;
            "
          >

            <div>
              <strong>Incidents:</strong>
              ${cluster.incidents.length}
            </div>

            <div>
              <strong>People affected:</strong>
              ${cluster.people}
            </div>

            <div>
              <strong>Highest priority:</strong>
              ${cluster.priority}/100
            </div>

          </div>
      `;

      /*
       * Show individual incidents in this zone.
       */
      cluster.incidents.forEach(
        (incident) => {
          content += `
            <div
              style="
                margin-top:10px;
                padding-top:8px;
                border-top:1px solid #e2e8f0;
                font-size:12px;
                color:#334155;
              "
            >

              <strong>
                ${incident.location}
              </strong>

              <br />

              ${incident.type}
              · Priority ${incident.priority}

              <br />

              ${incident.people}
              people affected

            </div>
          `;
        }
      );

      content += `</div>`;

      interaction
        .addTo(map)
        .bindPopup(content);

      popupLayers.push(interaction);
    });

    return () => {
      popupLayers.forEach((layer) => {
        map.removeLayer(layer);
      });
    };
  }, [incidents]);

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="relative h-full min-h-[500px] overflow-hidden rounded-xl">

      {/* MAP */}

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "500px",
        }}
      />

      {/* STATUS */}

      <div
        className="
          absolute
          left-4
          top-4
          z-[1000]
          rounded-lg
          bg-white
          px-4
          py-3
          shadow-md
        "
      >
        <div className="flex items-center gap-2">

          <span
            className="
              h-2
              w-2
              rounded-full
              bg-green-500
            "
          />

          <span
            className="
              text-xs
              font-bold
              tracking-wide
              text-slate-700
            "
          >
            LIVE CRISIS MAP
          </span>

        </div>

        <div className="mt-1 text-xs text-slate-500">
          {incidents.length} active incidents
        </div>
      </div>

      {/* LEGEND */}

      <div
        className="
          absolute
          bottom-4
          right-4
          z-[1000]
          rounded-xl
          bg-white
          p-4
          shadow-lg
        "
      >

        <div
          className="
            mb-3
            text-xs
            font-bold
            uppercase
            tracking-wide
            text-slate-600
          "
        >
          Crisis Intensity
        </div>

        <Legend
          gradient="linear-gradient(90deg,#f87171,#991b1b)"
          label="Critical"
        />

        <Legend
          gradient="linear-gradient(90deg,#fdba74,#c2410c)"
          label="High"
        />

        <Legend
          gradient="linear-gradient(90deg,#fde68a,#a16207)"
          label="Moderate"
        />

        <Legend
          gradient="linear-gradient(90deg,#93c5fd,#15803d)"
          label="Low"
        />

        <div
          className="
            mt-2
            border-t
            pt-2
            text-[10px]
            text-slate-400
          "
        >
          Only reported crisis areas
          are highlighted.
        </div>

      </div>

    </div>
  );
}

// ==================================================
// LEGEND
// ==================================================

function Legend({ gradient, label }) {
  return (
    <div className="flex items-center gap-2 py-1">

      <span
        className="h-3 w-7 rounded-full"
        style={{
          background: gradient,
        }}
      />

      <span className="text-xs text-slate-700">
        {label}
      </span>

    </div>
  );
}

export default DisasterMap;