import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  Brain,
  MessageSquareText,
  Satellite,
  Radio,
  GitMerge,
  MapPin,
  Users,
  ShieldAlert,
  X,
  ChevronRight,
  Layers,
} from "lucide-react";
import { apiGet } from "../services/api";

function Fusion() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const result = await apiGet("/api/fusion/");
        if (!active) {
          return;
        }
        setData(result);
        setSelected(result.cells?.[0] || null);
      } catch (fusionError) {
        console.error("Fusion API error:", fusionError);
        if (active) {
          setError("Unable to load fusion intelligence.");
        }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Header />

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-slate-700 border-t-emerald-500" />
              <p className="mt-4 text-xs text-slate-500">
                Loading fusion intelligence...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cells = data?.cells || [];
  const criticalCount = cells.filter((cell) => cell.severity === "Critical").length;

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          {/* Heading */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-[#0b1424] border border-[#1e293b] p-3 text-slate-200">
                <GitMerge size={20} />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-slate-100 tracking-wide">
                  MULTIMODAL FUSION
                </h1>

                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked operational heat map with explainable AI rationale
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {cells.length} GRID CELLS
            </div>
          </div>

          {/* Formula banner */}
          <div className="rounded-md border border-[#1e293b] bg-[#0f172a] px-5 py-4 mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <Layers size={16} className="text-slate-500" />
              <span className="text-[10px] font-bold tracking-wider text-slate-500">
                FUSION FORMULA
              </span>
              <span className="font-mono text-xs text-slate-200">
                Priority = 0.40 × Vision + 0.35 × NLP + 0.25 × Sensor
              </span>
            </div>

            <div className="flex items-center gap-5 ml-auto">
              <WeightChip color="rose" label="VISION" weight="40%" />
              <WeightChip color="amber" label="NLP URGENCY" weight="35%" />
              <WeightChip color="emerald" label="SENSOR RISK" weight="25%" />
              <span className="font-mono text-[10px] text-slate-600">
                {criticalCount} CRITICAL CELLS
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 mb-4 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Ranked heat map table */}
          <section className="rounded-md border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  PRIORITY HEAT MAP · RANKED GRID CELLS
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select a cell to inspect the explainable AI rationale
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e293b] bg-[#0b1424]">
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 w-10">
                      #
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Grid Cell
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Disaster
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 w-40">
                      Signal Heat
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      People
                    </th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Corroboration
                    </th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Priority
                    </th>
                    <th className="px-3 py-3 w-8" />
                  </tr>
                </thead>

                <tbody>
                  {cells.map((cell, index) => (
                    <FusionRow
                      key={cell.id}
                      cell={cell}
                      rank={index + 1}
                      selected={selected?.id === cell.id}
                      onClick={() => setSelected(cell)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* XAI drawer */}
          {selected && <XaiDrawer cell={selected} onClose={() => setSelected(null)} />}
        </main>
      </div>
    </div>
  );
}

function WeightChip({ color, label, weight }) {
  const classes = {
    rose: "text-rose-400 border-rose-500/30 bg-rose-500/10",
    amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  };

  return (
    <span className={`flex items-center gap-2 rounded-sm border px-2.5 py-1 text-[10px] font-bold ${classes[color]}`}>
      {label}
      <span className="font-mono">{weight}</span>
    </span>
  );
}

function FusionRow({ cell, rank, selected, onClick }) {
  const severityStyles = {
    Critical: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    High: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    Moderate: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    Low: "text-slate-300 bg-slate-500/10 border-slate-500/30",
  };

  return (
    <tr
      onClick={onClick}
      className={`border-b border-[#1e293b] cursor-pointer transition-colors ${
        selected ? "bg-[#131f38]" : "hover:bg-[#131f38]"
      }`}
    >
      <td className="px-3 py-3">
        <span className="font-mono text-[10px] text-slate-600">
          {String(rank).padStart(2, "0")}
        </span>
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-slate-500 shrink-0" />

          <div>
            <p className="text-xs font-bold text-slate-100">
              {cell.location}
            </p>
            <p className="text-[10px] font-mono text-slate-600">
              {cell.state} · {cell.incident_id}
            </p>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <span className="text-xs text-slate-300">{cell.disaster_type}</span>
      </td>

      <td className="px-3 py-3">
        <div className="space-y-1.5">
          <HeatBar label="VIS" value={cell.vision_damage_severity} tone="rose" />
          <HeatBar label="NLP" value={cell.nlp_urgency_score} tone="amber" />
          <HeatBar label="SEN" value={cell.sensor_alert_level} tone="emerald" />
        </div>
      </td>

      <td className="px-3 py-3">
        <span className="font-mono text-xs text-slate-200">
          {cell.people_affected}
        </span>
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
          <MessageSquareText size={11} className="text-slate-600" />
          {cell.corroborating_messages} MSG
          <Radio size={11} className="text-slate-600 ml-2" />
          {cell.top_sensor ? "1 NODE" : "0 NODE"}
        </div>
      </td>

      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-bold tracking-wide ${severityStyles[cell.severity]}`}
          >
            {cell.severity.toUpperCase()}
          </span>

          <span
            className={`font-mono text-base font-bold ${
              cell.priority >= 85
                ? "text-rose-400"
                : cell.priority >= 70
                  ? "text-amber-400"
                  : "text-slate-100"
            }`}
          >
            {Math.round(cell.priority)}
          </span>
        </div>
      </td>

      <td className="px-3 py-3">
        <ChevronRight size={14} className="text-slate-600" />
      </td>
    </tr>
  );
}

function HeatBar({ label, value, tone }) {
  const barClass = {
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] text-slate-600 w-7">{label}</span>

      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-[#0b1424]">
        <div
          className={`h-full rounded-sm ${barClass[tone]}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>

      <span className="font-mono text-[9px] text-slate-400 w-6 text-right">
        {Math.round(value)}
      </span>
    </div>
  );
}

function XaiDrawer({ cell, onClose }) {
  return (
    <div className="fixed inset-0 z-[2000]">
      <div
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-lg bg-[#0f172a] border-l border-[#1e293b] shadow-2xl flex flex-col overflow-auto">
        {/* Drawer header */}
        <div className="sticky top-0 bg-[#0f172a] border-b border-[#1e293b] px-5 py-4 flex items-start justify-between z-10">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 font-mono">
              {cell.id} · {cell.incident_id}
            </p>
            <h2 className="text-lg font-bold text-slate-100 mt-1">
              {cell.location}
              <span className="ml-2 text-xs font-mono font-medium text-slate-500">
                {cell.state}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {cell.disaster_type} · {cell.latitude?.toFixed(3)}N,{" "}
              {cell.longitude?.toFixed(3)}E
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-[#131f38] hover:text-slate-200 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Priority hero */}
          <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-500">
                  FUSED PRIORITY SCORE
                </p>
                <p
                  className={`font-mono text-5xl font-bold mt-2 ${
                    cell.priority >= 85
                      ? "text-rose-400"
                      : cell.priority >= 70
                        ? "text-amber-400"
                        : "text-slate-100"
                  }`}
                >
                  {Math.round(cell.priority)}
                  <span className="text-lg text-slate-500">/100</span>
                </p>
              </div>

              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-sm border text-[10px] font-bold tracking-wide ${
                  cell.severity === "Critical"
                    ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                    : cell.severity === "High"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                      : "text-slate-300 bg-slate-500/10 border-slate-500/30"
                }`}
              >
                {cell.severity.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Signal breakdown heat map */}
          <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-4">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 mb-4">
              SIGNAL CONTRIBUTION HEAT MAP
            </p>

            <SignalBar
              label="VISION DAMAGE"
              value={cell.vision_damage_severity}
              weight="× 0.40"
              tone="rose"
            />
            <SignalBar
              label="NLP URGENCY"
              value={cell.nlp_urgency_score}
              weight="× 0.35"
              tone="amber"
            />
            <SignalBar
              label="SENSOR RISK"
              value={cell.sensor_alert_level}
              weight="× 0.25"
              tone="emerald"
            />
          </div>

          {/* XAI rationale */}
          <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-3">
              <Brain size={14} />
              <p className="text-[10px] font-bold tracking-wider">
                EXPLAINABLE AI RATIONALE
              </p>
            </div>

            <p className="text-xs leading-relaxed text-slate-300 font-mono">
              {cell.explanation}
            </p>
          </div>

          {/* Operational facts */}
          <div className="grid grid-cols-2 gap-3">
            <FactCard
              icon={Users}
              label="PEOPLE AFFECTED"
              value={String(cell.people_affected)}
            />
            <FactCard
              icon={MessageSquareText}
              label="CORROBORATING MESSAGES"
              value={String(cell.corroborating_messages)}
            />
            <FactCard
              icon={Radio}
              label="TOP SENSOR NODE"
              value={cell.top_sensor || "None within 3km"}
            />
            <FactCard
              icon={ShieldAlert}
              label="REQUIRED AID"
              value={cell.required_aid}
            />
          </div>

          {/* Source ledger */}
          <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-4">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 mb-3">
              EVIDENCE LEDGER
            </p>

            <div className="space-y-2">
              <LedgerRow
                icon={Satellite}
                source="Vision Signal"
                detail={`${Math.round(cell.vision_damage_severity)}% damage severity estimate`}
                weight="40%"
              />
              <LedgerRow
                icon={MessageSquareText}
                source="NLP Signal"
                detail={`${cell.corroborating_messages} code-mixed crisis message(s) at urgency ${Math.round(
                  cell.nlp_urgency_score / 20
                )}/5`}
                weight="35%"
              />
              <LedgerRow
                icon={Radio}
                source="Sensor Signal"
                detail={
                  cell.top_sensor
                    ? `${cell.top_sensor} · alert ${Math.round(
                        cell.sensor_alert_level
                      )}/100 within ${cell.sensor_radius_km}km`
                    : "No node within 3km radius"
                }
                weight="25%"
              />
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-md bg-slate-100 p-4 text-slate-900">
            <p className="text-[10px] font-bold tracking-wider text-slate-600">
              RECOMMENDED RESPONSE
            </p>
            <p className="mt-1 text-sm font-bold">
              {cell.severity === "Critical" || cell.severity === "High"
                ? "Immediate Rescue + Medical Response"
                : `${cell.required_aid} Response`}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Dispatch per the fusion priority ranking; verify ground
              conditions with the nearest NDRF unit before commitment.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SignalBar({ label, value, weight, tone }) {
  const barClass = {
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
  };

  const textClass = {
    rose: "text-rose-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  };

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold tracking-wider text-slate-400">
          {label}
        </span>

        <span className="font-mono text-[10px] text-slate-500">
          <span className={textClass[tone]}>{Math.round(value)}</span>
          {" "}
          {weight}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-sm bg-[#0f172a]">
        <div
          className={`h-full rounded-sm transition-all duration-700 ${barClass[tone]}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function FactCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-3.5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={13} />
        <span className="text-[9px] font-bold tracking-wider">{label}</span>
      </div>

      <p className="mt-2 text-sm font-bold text-slate-100">{value}</p>
    </div>
  );
}

function LedgerRow({ icon: Icon, source, detail, weight }) {
  return (
    <div className="flex items-center gap-3 rounded border border-[#1e293b] bg-[#0f172a] px-3 py-2.5">
      <div className="text-slate-400">
        <Icon size={15} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-200">{source}</p>
        <p className="text-[10px] font-mono text-slate-500 truncate">
          {detail}
        </p>
      </div>

      <span className="font-mono text-[10px] font-bold text-slate-400">
        {weight}
      </span>
    </div>
  );
}

export default Fusion;
