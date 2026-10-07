import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Activity,
  Users,
  Siren,
  ChevronRight,
  ListFilter,
  CheckCheck,
  Clock3,
} from "lucide-react";

import PageShell from "../components/PageShell";
import DisasterMap from "../components/DisasterMap";
import SafetyCheckModal from "../components/SafetyCheckModal";
import DispatchModal from "../components/DispatchModal";
import SocialFeedPanel from "../components/SocialFeedPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet } from "../services/api";
import { useLocationContext } from "../services/locationContext";

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);

  // Shared post-login geolocation: power the safety briefing + map dot.
  const { position } = useLocationContext();
  const [safetyOpen, setSafetyOpen] = useState(true);
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [verdict, setVerdict] = useState("safe");
  const [dispatchTarget, setDispatchTarget] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [incidentData, sensorData, resourceData] = await Promise.all([
          apiGet("/api/incidents/"),
          apiGet("/api/sensors/"),
          apiGet("/api/resources/"),
        ]);

        if (!active) return;

        setIncidents(incidentData.incidents || []);
        setSensors(sensorData.sensors || []);
        setResources(resourceData);
      } catch (error) {
        console.error("Dashboard data error:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // 10 km radius safety check against the live grid.
  useEffect(() => {
    if (!position) return;
    let active = true;

    apiGet(
      `/api/geo/nearby?lat=${position.latitude.toFixed(5)}&lon=${position.longitude.toFixed(5)}&radius_km=10`
    )
      .then((data) => {
        if (!active) return;
        setVerdict(data.verdict || "safe");
        setSafetyChecked(true);
      })
      .catch(() => {
        if (active) setSafetyChecked(true);
      });

    return () => {
      active = false;
    };
  }, [position]);

  const openDispatch = useCallback((target) => {
    setDispatchTarget(target);
  }, []);

  const openSelfDispatch = useCallback(() => {
    setDispatchTarget({
      latitude: position?.latitude,
      longitude: position?.longitude,
      locationLabel: "Recorded GPS position",
      urgency: verdict === "danger" ? "Critical" : "High",
      disasterType: "General Emergency",
    });
  }, [position, verdict]);

  const totalIncidents = incidents.length;
  const peopleAffected = incidents.reduce(
    (total, incident) => total + Number(incident.people || 0),
    0
  );
  const criticalZones = incidents.filter(
    (incident) => Number(incident.priority || 0) >= 85
  ).length;
  const activeSensors = sensors.length;
  const sensorAlerts = sensors.filter(
    (sensor) => sensor.status === "Warning" || sensor.status === "Critical"
  ).length;
  const deployedUnits = resources?.deployed_units ?? 0;

  const topIncidents = [...incidents]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 6);

  const levelFor = (priority) =>
    priority >= 85
      ? "Critical"
      : priority >= 70
        ? "High"
        : priority >= 50
          ? "Moderate"
          : "Low";

  return (
    <PageShell
      safetyVerdict={safetyChecked ? verdict : null}
      onOpenSafety={() => setSafetyOpen(true)}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Situation overview</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-ops-text)]">
            Situation Overview
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-ops-muted)]">
            Live operational grid · PAN India coverage · satellite, seismic, alert and field feeds
          </p>
        </div>

        {/* Single SOS entry point for the whole page — the dispatch channel
            panel is read-only so this action is never duplicated. */}
        <Button
          type="button"
          variant="sos"
          onClick={openSelfDispatch}
          disabled={!position}
          title={position ? undefined : "Waiting for a GPS fix"}
        >
          <Siren size={14} aria-hidden="true" />
          Request rescue dispatch
        </Button>
      </div>

      {/* Operational statistics — compact strip above the map hero */}
      <div className="reveal-stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={AlertTriangle}
          label="LIVE INCIDENTS"
          value={loading ? null : String(totalIncidents).padStart(2, "0")}
          delta={`${peopleAffected} PEOPLE AFFECTED`}
          loading={loading}
        />

        <StatCard
          icon={Siren}
          label="CRITICAL ZONES"
          value={loading ? null : String(criticalZones).padStart(2, "0")}
          delta="PRIORITY 85+ CELLS"
          tone="rose"
          loading={loading}
        />

        <StatCard
          icon={Activity}
          label="ACTIVE SENSORS"
          value={loading ? null : String(activeSensors).padStart(2, "0")}
          delta={`${sensorAlerts} SENSOR ALERTS`}
          tone="amber"
          loading={loading}
        />

        <StatCard
          icon={Users}
          label="EMERGENCY UNITS"
          value={loading ? null : String(deployedUnits).padStart(2, "0")}
          delta="DEPLOYED ACROSS GRID"
          loading={loading}
        />
      </div>

      {/* Map hero — the primary operations canvas, full width */}
      <section className="panel reveal mt-4 overflow-hidden" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="panel-title">LIVE SITUATION MAP</h2>
            <p className="panel-sub mt-0.5">
              Humanitarian priority by geographic intensity
            </p>
          </div>
          <span className="flex items-center gap-2 font-mono text-[10px] font-semibold text-[var(--color-ops-safe)]">
            <span className="live-dot live-dot--live" aria-hidden="true" />
            AUTO-FIT
          </span>
        </div>

        <div className="h-[clamp(480px,62vh,860px)] border-t border-[var(--color-ops-line)]">
          <DisasterMap
            userPosition={position}
            safetyVerdict={safetyChecked ? verdict : null}
            onDispatchRequest={openDispatch}
          />
        </div>
      </section>

      {/* Priority queue + social intelligence + live dispatch channel */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <section className="panel reveal flex h-[440px] flex-col" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between border-b border-[var(--color-ops-line)] px-4 py-3">
            <div>
              <h2 className="panel-title">PRIORITY QUEUE</h2>
              <p className="panel-sub mt-0.5">
                Locations requiring immediate attention
              </p>
            </div>
            <ListFilter size={14} className="text-[var(--color-ops-muted)]" />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {loading &&
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="skeleton h-[58px] border border-[var(--color-ops-line)]"
                />
              ))}

            {!loading &&
              topIncidents.map((incident, index) => (
                <QueueRow
                  key={incident.id}
                  rank={index + 1}
                  location={incident.location}
                  state={incident.state}
                  score={incident.priority}
                  people={incident.people}
                  source={incident.source}
                  level={levelFor(incident.priority)}
                  onDispatch={() =>
                    openDispatch({
                      latitude: Number(incident.latitude),
                      longitude: Number(incident.longitude),
                      locationLabel: incident.location,
                      urgency: incident.urgency || levelFor(incident.priority),
                      disasterType: incident.type || "General Emergency",
                      incidentId: incident.id,
                    })
                  }
                />
              ))}

            {!loading && topIncidents.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-[var(--color-ops-muted)]">
                No live incidents on the grid right now.
              </p>
            )}
          </div>
        </section>

        <section className="panel reveal col-span-1 h-[420px] overflow-hidden xl:col-span-2" style={{ animationDelay: "240ms" }}>
          <SocialFeedPanel limit={7} />
        </section>

        <DispatchChannelPanel />
      </div>

      <SafetyCheckModal open={safetyOpen} onClose={() => setSafetyOpen(false)} />

      <DispatchModal
        open={Boolean(dispatchTarget)}
        onClose={() => setDispatchTarget(null)}
        prefill={dispatchTarget || {}}
      />
    </PageShell>
  );
}

/* Live dispatch channel: active SOS tickets routed through the grid.
 * Replaces the former static briefing card (its CTA duplicated the
 * header's dispatch button). */
function DispatchChannelPanel() {
  const [dispatches, setDispatches] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const load = () => {
      apiGet("/api/dispatch/?active_only=true")
        .then((data) => {
          if (active) setDispatches(data.dispatches || []);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoaded(true);
        });
    };

    load();
    const timer = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="panel flex h-[420px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-ops-line)] px-4 py-3">
        <div>
          <h2 className="panel-title">RESCUE DISPATCH CHANNEL</h2>
          <p className="panel-sub mt-0.5">Active SOS tickets on the grid</p>
        </div>
        {dispatches.length > 0 && (
          <Badge tone="crit">{dispatches.length} LIVE</Badge>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {dispatches.map((dispatch) => (
          <div
            key={dispatch.id}
            className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="data-value text-xs text-[var(--color-ops-text)]">
                {dispatch.id}
              </span>
<span className="badge badge-warn">
              <Clock3 size={10} aria-hidden="true" />
              {String(dispatch.urgency).toUpperCase()}
            </span>
            </div>
            <p className="mt-1 truncate text-xs text-[var(--color-ops-secondary)]">
              {dispatch.disaster_type} · {dispatch.location_label}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-[var(--color-ops-muted)]">
              {dispatch.assigned_units?.[0]
                ? `${dispatch.assigned_units[0].unit} · ${dispatch.assigned_units[0].distance_km} KM · ETA ${dispatch.assigned_units[0].eta_minutes} MIN`
                : "ROUTING UNITS…"}
            </p>
          </div>
        ))}

        {loaded && dispatches.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <CheckCheck size={22} className="text-[var(--color-ops-muted)]" />
            <p className="text-xs text-[var(--color-ops-secondary)]">
              No active rescue dispatches.
            </p>
            <p className="font-mono text-[10px] text-[var(--color-ops-muted)]">
              All tickets resolved · channel clear
            </p>
          </div>
        )}

        {!loaded && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="skeleton h-[74px] border border-[var(--color-ops-line)]"
              />
            ))}
          </div>
        )}
      </div>

      {/* Single SOS entry point for the whole page — the dispatch channel
          panel below is read-only so this action is never duplicated. */}
      <div className="border-t border-[var(--color-ops-line)] px-3 py-3">
        <p className="text-center font-mono text-[10px] leading-relaxed text-[var(--color-ops-muted)]">
          CHANNEL UPDATES EVERY 20S
        </p>
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, delta, tone, loading }) {
  const accent =
    tone === "rose"
      ? "text-[var(--color-ops-crit)]"
      : tone === "amber"
        ? "text-[var(--color-ops-warn)]"
        : "text-[var(--color-ops-secondary)]";

  return (
    <div className="panel-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>

        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)]">
          <Icon size={14} className={accent} aria-hidden="true" />
        </div>
      </div>

      {loading ? (
        <div className="skeleton mt-3 h-8 w-16" />
      ) : (
        <p className="data-value mt-2 text-3xl text-[var(--color-ops-text)]">{value}</p>
      )}

      <p className="mt-1.5 font-mono text-[10px] tracking-wide text-[var(--color-ops-muted)]">
        {delta}
      </p>
    </div>
  );
}

function QueueRow({ rank, location, state, score, people, source, level, onDispatch }) {
  const levelStyles = {
    Critical: "badge-crit",
    High: "badge-warn",
    Moderate: "badge-info",
    Low: "badge-muted",
  };

  return (
    <div className="group rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 py-2.5 transition-all duration-200 hover:-translate-y-px hover:border-[var(--color-ops-line-strong)] hover:bg-[var(--color-ops-overlay)]">
      <div className="flex items-center gap-3">
        <span className="data-value w-5 text-[10px] text-[var(--color-ops-muted)]">
          {String(rank).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-semibold text-[var(--color-ops-text)]">
              {location}
            </p>
            {state && (
              <span className="shrink-0 font-mono text-[9px] uppercase text-[var(--color-ops-muted)]">
                {state}
              </span>
            )}
          </div>

          <p className="mt-0.5 font-mono text-[10px] text-[var(--color-ops-muted)]">
            {people} PPL · {source || "LIVE"}
          </p>
        </div>

        <div className="text-right">
          <p
            className={`data-value text-sm ${
              score >= 85
                ? "text-[var(--color-ops-crit)]"
                : score >= 70
                  ? "text-[var(--color-ops-warn)]"
                  : "text-[var(--color-ops-text)]"
            }`}
          >
            {score}
          </p>
          <span className={`badge mt-1 ${levelStyles[level]}`}>{level}</span>
        </div>

        <button
          type="button"
          onClick={onDispatch}
          aria-label={`Request rescue dispatch for ${location}`}
          className="rounded border border-[color-mix(in_srgb,var(--color-ops-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-crit)_10%,transparent)] p-1.5 text-[var(--color-ops-crit)] opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Siren size={12} />
        </button>

        <ChevronRight size={13} className="text-[var(--color-ops-muted)]" />
      </div>
    </div>
  );
}

export default Dashboard;
