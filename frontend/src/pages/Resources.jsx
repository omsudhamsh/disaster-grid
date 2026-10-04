import { useEffect, useMemo, useState } from "react";
import { useAuth, SignInButton } from "@clerk/react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  Truck,
  Users,
  Package,
  HeartPulse,
  Droplets,
  MapPin,
  Lock,
  CheckCircle,
  Ship,
  Drone,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { apiGet } from "../services/api";

const INVENTORY_ICONS = {
  "Rescue Boats": Ship,
  "Medical Teams": HeartPulse,
  "Survey Drones": Drone,
  "NDRF Squads": ShieldCheck,
  "Relief Camps": Package,
  "Water Supply Units": Droplets,
};

function Resources() {
  const { isSignedIn } = useAuth();
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [confirmed, setConfirmed] = useState({});

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const resourceData = await apiGet("/api/resources/");

        if (!active) {
          return;
        }

        setResources(resourceData);
      } catch (fetchError) {
        console.error(fetchError);
        if (active) {
          setError("Unable to load resource intelligence.");
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

  const allocations = useMemo(
    () => resources?.allocations || [],
    [resources]
  );
  const inventory = useMemo(
    () => resources?.inventory || [],
    [resources]
  );
  const deployedUnits = resources?.deployed_units ?? 0;

  const selected = useMemo(
    () => allocations.find((item) => item.incident_id === selectedId) || allocations[0],
    [allocations, selectedId]
  );

  const totalAvailable = inventory.reduce(
    (sum, item) => sum + item.available,
    0
  );

  const peopleRequiringAid = allocations.reduce(
    (sum, item) => sum + Number(item.people || 0),
    0
  );

  const unitIcon = (unit) => {
    if (/boat/i.test(unit)) {
      return Ship;
    }
    if (/drone/i.test(unit)) {
      return Drone;
    }
    if (/ndrf/i.test(unit)) {
      return ShieldCheck;
    }
    if (/medical/i.test(unit)) {
      return HeartPulse;
    }
    return Truck;
  };

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
                <Truck size={20} />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-slate-100 tracking-wide">
                  RESPONSE RESOURCES
                </h1>

                <p className="text-xs text-slate-500 mt-0.5">
                  Dynamic allocation of rescue units per grid cell
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {loading ? "SYNCING" : `${deployedUnits} UNITS ALLOCATED`}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4 grid grid-cols-3 gap-4">
            <SummaryCard
              icon={Package}
              title="AVAILABLE UNITS"
              value={loading ? "--" : totalAvailable}
              subtitle="ACROSS RESPONSE NETWORK"
            />
            <SummaryCard
              icon={MapPin}
              title="PRIORITY INCIDENTS"
              value={loading ? "--" : allocations.length}
              subtitle="REQUIRE IMMEDIATE AID"
              tone="amber"
            />
            <SummaryCard
              icon={Users}
              title="PEOPLE REQUIRING AID"
              value={loading ? "--" : peopleRequiringAid}
              subtitle="ACROSS PRIORITY ZONES"
              tone="rose"
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 mb-4 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {/* Recommended deployments */}
            <section className="col-span-2 rounded-md border border-[#1e293b] bg-[#0f172a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e293b]">
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  RECOMMENDED DEPLOYMENTS
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dynamic allocation based on incident priority and
                  reported needs
                </p>
              </div>

              <div className="p-3 space-y-2">
                {allocations.map((allocation) => (
                  <AllocationRow
                    key={allocation.incident_id}
                    allocation={allocation}
                    selected={selected?.incident_id === allocation.incident_id}
                    unitIcon={unitIcon}
                    onClick={() => setSelectedId(allocation.incident_id)}
                  />
                ))}

                {!loading && allocations.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-10">
                    No priority incidents requiring allocation.
                  </p>
                )}
              </div>
            </section>

            {/* Allocation detail */}
            <section className="rounded-md border border-[#1e293b] bg-[#0f172a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e293b]">
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  ALLOCATION DETAIL
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Units committed to the selected cell
                </p>
              </div>

              {!selected ? (
                <div className="flex min-h-72 items-center justify-center text-center">
                  <div>
                    <Package size={32} className="mx-auto text-slate-700" />
                    <p className="mt-3 text-xs text-slate-500">
                      No incident selected
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="rounded-md bg-slate-100 p-4 text-slate-900">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      SELECTED INCIDENT
                    </p>
                    <p className="mt-1 text-base font-bold">
                      {selected.location}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                      {selected.incident_id} · {selected.state} · PRIORITY{" "}
                      {selected.priority}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-700">
                      {selected.people} people affected · Needs:{" "}
                      {selected.needs}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold tracking-wider text-slate-500">
                      COMMITTED UNITS
                    </p>

                    {selected.units.map((unit) => {
                      const Icon = unitIcon(unit);

                      return (
                        <div
                          key={unit}
                          className="flex items-center gap-3 rounded-md border border-[#1e293b] bg-[#0b1424] px-3 py-2.5"
                        >
                          <div className="rounded border border-[#1e293b] bg-[#0f172a] p-2 text-slate-300">
                            <Icon size={14} />
                          </div>

                          <span className="text-xs font-semibold text-slate-200">
                            {unit}
                          </span>

                          {confirmed[selected.incident_id + unit] ? (
                            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <CheckCircle size={11} />
                              CONFIRMED
                            </span>
                          ) : (
                            <span className="ml-auto font-mono text-[10px] text-slate-600">
                              READY
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isSignedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...confirmed };
                        selected.units.forEach(
                          (unit) =>
                            (next[selected.incident_id + unit] = true)
                        );
                        setConfirmed(next);
                      }}
                      className="w-full rounded-md bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-white"
                    >
                      CONFIRM DEPLOYMENT
                    </button>
                  ) : (
                    <SignInButton mode="modal">
                      <button className="flex w-full items-center justify-center gap-2 rounded-md border border-[#1e293b] bg-[#0b1424] px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-[#131f38]">
                        <Lock size={13} />
                        SIGN IN TO CONFIRM DEPLOYMENT
                      </button>
                    </SignInButton>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Resource inventory */}
          <section className="mt-4 rounded-md border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  RESOURCE INVENTORY
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Current availability across the response network
                </p>
              </div>

              <span className="text-[10px] font-mono text-slate-600">
                {inventory.length} UNIT CLASSES
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {inventory.map((resource) => (
                <InventoryCard key={resource.id} resource={resource} />
              ))}
            </div>
          </section>

          <p className="mt-3 text-center text-[10px] font-mono text-slate-600">
            ALLOCATION ENGINE · BOATS / MEDICAL TEAMS / DRONES / NDRF SQUADS
          </p>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value, subtitle, tone }) {
  const valueColor =
    tone === "rose"
      ? "text-rose-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-slate-100";

  return (
    <div className="rounded-md border border-[#1e293b] bg-[#0f172a] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-slate-500">
          {title}
        </p>
        <Icon size={14} className="text-slate-500" />
      </div>

      <p className={`font-mono text-3xl font-semibold mt-2 ${valueColor}`}>
        {value}
      </p>

      <p className="text-[10px] font-mono text-slate-600 mt-1">
        {subtitle}
      </p>
    </div>
  );
}

function AllocationRow({ allocation, selected, unitIcon, onClick }) {  return (
    <div
      onClick={onClick}
      className={`rounded-md border p-3.5 cursor-pointer transition-colors ${
        selected
          ? "border-slate-500 bg-[#131f38]"
          : "border-[#1e293b] bg-[#0b1424] hover:bg-[#131f38]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded border border-[#1e293b] bg-[#0f172a] p-2 text-slate-400 shrink-0">
            <MapPin size={15} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-100">
                {allocation.location}
              </h3>
              <span className="font-mono text-[9px] text-slate-600">
                {allocation.incident_id}
              </span>
            </div>

            <p className="text-[10px] font-mono text-slate-500 mt-1">
              {allocation.people} PPL AFFECTED · {allocation.state}
            </p>
          </div>
        </div>

        <span
          className={`font-mono text-sm font-bold shrink-0 ${
            allocation.priority >= 85
              ? "text-rose-400"
              : allocation.priority >= 70
                ? "text-amber-400"
                : "text-slate-100"
          }`}
        >
          {allocation.priority}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {allocation.units.map((unit) => {
          const Icon = unitIcon(unit);

          return (
            <span
              key={unit}
              className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#0f172a] px-2.5 py-1 text-[10px] font-semibold text-slate-300"
            >
              <Icon size={11} className="text-slate-500" />
              {unit}
            </span>
          );
        })}

        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-slate-500">
          VIEW ALLOCATION
          <ChevronRight size={12} />
        </span>
      </div>
    </div>
  );
}

function InventoryCard({ resource }) {
  const percentage =
    resource.total > 0
      ? (resource.available / resource.total) * 100
      : 0;

  const Icon = INVENTORY_ICONS[resource.type] ?? Truck;

  return (
    <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded border border-[#1e293b] bg-[#0f172a] p-2 text-slate-300">
            <Icon size={15} />
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-100">
              {resource.type}
            </h3>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              {resource.location}
            </p>
          </div>
        </div>

        <span
          className={`rounded-sm px-2 py-0.5 text-[9px] font-bold tracking-wide ${
            resource.status === "Available"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
          }`}
        >
          {resource.status.toUpperCase()}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <span className="font-mono text-2xl font-bold text-slate-100">
            {resource.available}
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            {" "}
            / {resource.total} READY
          </span>
        </div>

        <span className="font-mono text-[10px] text-slate-500">
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-[#0f172a]">
        <div
          className={`h-full rounded-sm ${
            percentage < 30
              ? "bg-rose-500"
              : percentage < 60
                ? "bg-amber-500"
                : "bg-emerald-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default Resources;
