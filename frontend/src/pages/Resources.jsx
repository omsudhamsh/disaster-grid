import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Users,
  Package,
  HeartPulse,
  Droplets,
  MapPin,
  CheckCircle,
  Ship,
  Drone,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
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
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [confirmed, setConfirmed] = useState({});

  // Shared loader. It performs no synchronous setState so it is safe to
  // call from an effect; the manual-refresh spinner lives in `refresh`
  // and is owned by the click handler.
  const load = useCallback(async () => {
    try {
      const data = await apiGet("/api/resources/");
      setResources(data);
      setError("");
    } catch (fetchError) {
      console.error(fetchError);
      setError("Unable to load resource intelligence.");
    } finally {
      setLoading(false);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  useEffect(() => {
    // Async data fetch: every setState below happens after the network
    // round-trip resolves, never synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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
    <PageShell >
          {/* Heading */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">Relief network</p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-ops-text)]">
                Response Resources
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-ops-muted)]">
                Dynamic allocation of rescue units per grid cell
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="safe">
                <span className="live-dot live-dot--live" aria-hidden="true" />
                {loading ? "SYNCING" : `${deployedUnits} UNITS ALLOCATED`}
              </Badge>

              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={refresh}
                disabled={refreshing}
                aria-busy={refreshing}
              >
                <RefreshCw size={12} aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Recommended deployments */}
            <section className="col-span-2 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-ops-line)]">
                <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                  RECOMMENDED DEPLOYMENTS
                </h2>
                <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
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
                  <p className="text-xs text-[var(--color-ops-muted)] text-center py-10">
                    No priority incidents requiring allocation.
                  </p>
                )}
              </div>
            </section>

            {/* Allocation detail */}
            <section className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-ops-line)]">
                <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                  ALLOCATION DETAIL
                </h2>
                <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
                  Units committed to the selected cell
                </p>
              </div>

              {!selected ? (
                <div className="flex min-h-72 items-center justify-center text-center">
                  <div>
                    <Package size={32} className="mx-auto text-[var(--color-ops-muted)]" />
                    <p className="mt-3 text-xs text-[var(--color-ops-muted)]">
                      No incident selected
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  <div className="rounded-md border border-[var(--color-ops-line-strong)] bg-[var(--color-ops-raised)] p-4 text-[var(--color-ops-text)]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-ops-muted)]">
                      SELECTED INCIDENT
                    </p>
                    <p className="mt-1 text-base font-bold">
                      {selected.location}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--color-ops-muted)]">
                      {selected.incident_id} · {selected.state} · PRIORITY{" "}
                      {selected.priority}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--color-ops-muted)]">
                      {selected.people} people affected · Needs:{" "}
                      {selected.needs}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold tracking-wider text-[var(--color-ops-muted)]">
                      COMMITTED UNITS
                    </p>

                    {selected.units.map((unit) => {
                      const Icon = unitIcon(unit);

                      return (
                        <div
                          key={unit}
                          className="flex items-center gap-3 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 py-2.5"
                        >
                          <div className="rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-2 text-[var(--color-ops-secondary)]">
                            <Icon size={14} />
                          </div>

                          <span className="text-xs font-semibold text-[var(--color-ops-text)]">
                            {unit}
                          </span>

                          {confirmed[selected.incident_id + unit] ? (
                            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <CheckCircle size={11} />
                              CONFIRMED
                            </span>
                          ) : (
                            <span className="ml-auto font-mono text-[10px] text-[var(--color-ops-muted)]">
                              READY
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Single deployment action — the auth gate already guarantees a
                      signed-in responder, so no sign-in duplicate exists. */}
                  <Button
                    type="button"
                    variant="default"
                    block
                    onClick={() => {
                      const next = { ...confirmed };
                      selected.units.forEach((unit) => {
                        next[selected.incident_id + unit] = true;
                      });
                      setConfirmed(next);
                    }}
                  >
                    Confirm deployment
                  </Button>
                </div>
              )}
            </section>
          </div>

          {/* Resource inventory */}
          <section className="mt-4 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-ops-line)] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                  RESOURCE INVENTORY
                </h2>
                <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
                  Current availability across the response network
                </p>
              </div>

              <span className="text-[10px] font-mono text-[var(--color-ops-muted)]">
                {inventory.length} UNIT CLASSES
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {inventory.map((resource) => (
                <InventoryCard key={resource.id} resource={resource} />
              ))}
            </div>
          </section>

          <p className="mt-3 text-center text-[10px] font-mono text-[var(--color-ops-muted)]">
            ALLOCATION ENGINE · BOATS / MEDICAL TEAMS / DRONES / NDRF SQUADS
          </p>
    </PageShell>
  );
}

function SummaryCard({ icon: Icon, title, value, subtitle, tone }) {
  const valueColor =
    tone === "rose"
      ? "text-rose-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-[var(--color-ops-text)]";

  return (
    <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-[var(--color-ops-muted)]">
          {title}
        </p>
        <Icon size={14} className="text-[var(--color-ops-muted)]" />
      </div>

      <p className={`font-mono text-3xl font-semibold mt-2 ${valueColor}`}>
        {value}
      </p>

      <p className="text-[10px] font-mono text-[var(--color-ops-muted)] mt-1">
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
          ? "border-[var(--color-ops-line-strong)] bg-[var(--color-ops-overlay)]"
          : "border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] hover:bg-[var(--color-ops-overlay)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-2 text-[var(--color-ops-secondary)] shrink-0">
            <MapPin size={15} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[var(--color-ops-text)]">
                {allocation.location}
              </h3>
              <span className="font-mono text-[9px] text-[var(--color-ops-muted)]">
                {allocation.incident_id}
              </span>
            </div>

            <p className="text-[10px] font-mono text-[var(--color-ops-muted)] mt-1">
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
                : "text-[var(--color-ops-text)]"
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
              className="flex items-center gap-1.5 rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ops-secondary)]"
            >
              <Icon size={11} className="text-[var(--color-ops-muted)]" />
              {unit}
            </span>
          );
        })}

        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-[var(--color-ops-muted)]">
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
    <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-2 text-[var(--color-ops-secondary)]">
            <Icon size={15} />
          </div>

          <div>
            <h3 className="text-xs font-bold text-[var(--color-ops-text)]">
              {resource.type}
            </h3>
            <p className="text-[10px] font-mono text-[var(--color-ops-muted)] mt-0.5">
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
          <span className="font-mono text-2xl font-bold text-[var(--color-ops-text)]">
            {resource.available}
          </span>
          <span className="font-mono text-[10px] text-[var(--color-ops-muted)]">
            {" "}
            / {resource.total} READY
          </span>
        </div>

        <span className="font-mono text-[10px] text-[var(--color-ops-muted)]">
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-[var(--color-ops-panel)]">
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
