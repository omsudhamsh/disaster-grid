import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Activity,
  Users,
  Siren,
  MapPin,
  ChevronRight,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import DisasterMap from "../components/DisasterMap";
import { apiGet } from "../services/api";

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [incidentData, sensorData, resourceData] = await Promise.all([
          apiGet("/api/incidents/"),
          apiGet("/api/sensors/"),
          apiGet("/api/resources/"),
        ]);

        if (!active) {
          return;
        }

        setIncidents(incidentData.incidents || []);
        setSensors(sensorData.sensors || []);
        setResources(resourceData);
      } catch (error) {
        console.error("Dashboard data error:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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
    <div className="min-h-screen bg-[#0f172a] flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-100 tracking-wide">
                SITUATION OVERVIEW
              </h1>

              <p className="text-xs text-slate-500 mt-1">
                Live operational grid · Telangana · Andhra Pradesh · Tamil
                Nadu · Karnataka · Kerala
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  loading ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              {loading ? "SYNCING FEEDS" : "LIVE"}
            </div>
          </div>

          {/* Operational statistics */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={AlertTriangle}
              label="TOTAL INCIDENTS"
              value={loading ? "--" : String(totalIncidents).padStart(2, "0")}
              delta={`${peopleAffected} PEOPLE AFFECTED`}
            />

            <StatCard
              icon={Siren}
              label="CRITICAL GRID ZONES"
              value={loading ? "--" : String(criticalZones).padStart(2, "0")}
              delta="PRIORITY 85+ CELLS"
              tone="rose"
            />

            <StatCard
              icon={Activity}
              label="ACTIVE SENSORS"
              value={loading ? "--" : String(activeSensors).padStart(2, "0")}
              delta={`${sensorAlerts} SENSOR ALERTS`}
              tone="amber"
            />

            <StatCard
              icon={Users}
              label="EMERGENCY UNITS"
              value={loading ? "--" : String(deployedUnits).padStart(2, "0")}
              delta="DEPLOYED ACROSS GRID"
            />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {/* Map */}
            <Panel className="col-span-2 overflow-hidden">
              <PanelHeader
                title="LIVE SITUATION MAP"
                sub="Humanitarian priority by geographic intensity"
                right={
                  <span className="flex items-center gap-2 text-[10px] font-semibold text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    AUTO-FIT
                  </span>
                }
              />

              <div className="h-[420px] border-t border-[#1e293b]">
                <DisasterMap />
              </div>
            </Panel>

            {/* Priority queue */}
            <Panel className="flex flex-col">
              <PanelHeader
                title="PRIORITY QUEUE"
                sub="Locations requiring immediate attention"
              />

              <div className="p-3 space-y-2 flex-1">
                {topIncidents.map((incident, index) => (
                  <QueueRow
                    key={incident.id}
                    rank={index + 1}
                    location={incident.location}
                    state={incident.state}
                    score={incident.priority}
                    people={incident.people}
                    level={levelFor(incident.priority)}
                  />
                ))}

                {!loading && topIncidents.length === 0 && (
                  <p className="text-sm text-slate-500 px-2 py-6 text-center">
                    No incidents reported.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}

function Panel({ className = "", children }) {
  return (
    <div className={`rounded-md border border-[#1e293b] bg-[#0f172a] ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({ title, sub, right }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <h2 className="text-xs font-bold tracking-wider text-slate-200">
          {title}
        </h2>

        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
      </div>

      {right}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, delta, tone }) {
  const accent =
    tone === "rose"
      ? "text-rose-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-slate-400";

  return (
    <div className="rounded-md border border-[#1e293b] bg-[#0f172a] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-slate-500">
          {label}
        </p>

        <div className="w-7 h-7 rounded border border-[#1e293b] bg-[#0b1424] flex items-center justify-center">
          <Icon size={14} className={accent} />
        </div>
      </div>

      <p className={`font-mono text-3xl font-semibold mt-2 ${
        tone === "rose" ? "text-rose-400" : "text-slate-100"
      }`}>
        {value}
      </p>

      <p className="text-[10px] text-slate-500 mt-1 font-mono tracking-wide">
        {delta}
      </p>
    </div>
  );
}

function QueueRow({ rank, location, state, score, people, level }) {
  const levelStyles = {
    Critical: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    High: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    Moderate: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    Low: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  };

  return (
    <div className="flex items-center gap-3 rounded border border-[#1e293b] bg-[#0b1424] px-3 py-2.5 hover:bg-[#131f38] transition-colors">
      <span className="font-mono text-[10px] text-slate-600 w-5">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <MapPin size={12} className="text-slate-500 shrink-0" />

          <p className="text-xs font-semibold text-slate-200 truncate">
            {location}
          </p>

          {state && (
            <span className="text-[9px] font-mono uppercase text-slate-600">
              {state}
            </span>
          )}
        </div>

        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
          {people} PPL
        </p>
      </div>

      <div className="text-right">
        <p className={`font-mono text-sm font-bold ${
          score >= 85 ? "text-rose-400" : score >= 70 ? "text-amber-400" : "text-slate-200"
        }`}>
          {score}
        </p>

        <span className={`inline-block mt-1 px-1.5 py-px rounded-sm border text-[9px] font-bold tracking-wide ${levelStyles[level]}`}>
          {level.toUpperCase()}
        </span>
      </div>

      <ChevronRight size={13} className="text-slate-600" />
    </div>
  );
}

export default Dashboard;
