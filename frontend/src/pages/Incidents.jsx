import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  MapPin,
  Users,
  Clock3,
  Search,
  Filter,
  Plus,
  X,
  ChevronDown,
  Siren,
} from "lucide-react";
import { reportIncident } from "../services/incidentServices";
import { apiGet } from "../services/api";
import DispatchModal from "../components/DispatchModal";

const EMPTY_FORM = {
  location: "",
  state: "",
  latitude: "",
  longitude: "",
  type: "Flood",
  urgency: "High",
  people: "",
  aid: "Rescue",
  source: "Field Report",
};

const DISASTER_TYPES = [
  "Flood",
  "Earthquake",
  "Cyclone",
  "Wildfire",
  "Landslide",
  "Structural Damage",
  "Waterlogging",
  "Evacuation",
  "Food Shortage",
];

const URGENCY_LEVELS = ["Critical", "High", "Moderate", "Low"];

const inputClass =
  "h-10 w-full rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 text-sm text-[var(--color-ops-text)] outline-none placeholder:text-[var(--color-ops-muted)] focus:border-[var(--color-ops-line-strong)] focus:ring-1 focus:ring-[var(--color-ops-accent)]";

function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");

  const [showReportDrawer, setShowReportDrawer] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [dispatchTarget, setDispatchTarget] = useState(null);

  useEffect(() => {
    let active = true;

    const load = () => {
      apiGet("/api/incidents/")
        .then((data) => {
          if (!active) return;
          setIncidents(data.incidents || []);
          setError("");
        })
        .catch(() => {
          if (active) setError("Unable to connect to Disaster Grid backend.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const data = await reportIncident({
        location: form.location,
        state: form.state || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        type: form.type,
        urgency: form.urgency,
        people: Number(form.people || 0),
        aid: form.aid,
        source: form.source,
      });

      setIncidents((current) => [data.incident, ...current]);
      setShowReportDrawer(false);
      setForm(EMPTY_FORM);
    } catch (reportError) {
      setSubmitError(reportError.message || "Unable to submit the report.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    const query = search.toLowerCase().trim();

    return [...incidents]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .filter((incident) => {
        if (typeFilter !== "All" && incident.type !== typeFilter) {
          return false;
        }

        if (urgencyFilter !== "All" && incident.urgency !== urgencyFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        return (
          incident.id?.toLowerCase().includes(query) ||
          incident.location?.toLowerCase().includes(query) ||
          incident.state?.toLowerCase().includes(query) ||
          incident.type?.toLowerCase().includes(query) ||
          incident.source?.toLowerCase().includes(query) ||
          incident.aid?.toLowerCase().includes(query)
        );
      });
  }, [incidents, search, typeFilter, urgencyFilter]);

  const criticalCount = incidents.filter(
    (incident) => incident.urgency === "Critical"
  ).length;

  const peopleAffected = incidents.reduce(
    (total, incident) => total + Number(incident.people || 0),
    0
  );

  const locationsCount = new Set(incidents.map((i) => i.location)).size;

  return (
    <PageShell >
          {/* Page heading */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-[var(--color-ops-text)] tracking-wide">
                LIVE INCIDENTS
              </h1>

              <p className="text-xs text-[var(--color-ops-muted)] mt-1">
                Monitor and prioritize incoming disaster reports.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[var(--color-ops-secondary)]">
                <span className="live-dot live-dot--live" aria-hidden="true" />
                {loading ? "SYNCING" : `${incidents.length} ACTIVE`}
              </div>

              {/* The whole console sits behind the auth gate, so this is
                  the single report entry point — no sign-in duplicate. */}
              <Button type="button" variant="default" onClick={() => setShowReportDrawer(true)}>
                <Plus size={14} aria-hidden="true" />
                Report incident
              </Button>
            </div>
          </div>

          {/* Summary strip */}
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MiniStat
              icon={AlertTriangle}
              title="CRITICAL"
              value={loading ? "--" : String(criticalCount).padStart(2, "0")}
            />
            <MiniStat
              icon={Users}
              title="PEOPLE AFFECTED"
              value={loading ? "--" : peopleAffected}
            />
            <MiniStat
              icon={MapPin}
              title="LOCATIONS"
              value={loading ? "--" : locationsCount}
            />
            <MiniStat
              icon={Clock3}
              title="TOTAL REPORTS"
              value={loading ? "--" : incidents.length}
            />
          </div>

          {/* Search / filter bar */}
          <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ops-muted)]"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, location, type, source..."
                  className="h-9 w-full rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] pl-9 pr-3 text-sm text-[var(--color-ops-text)] outline-none placeholder:text-[var(--color-ops-muted)] focus:border-[var(--color-ops-line-strong)]"
                />
              </div>

              <div className="flex items-center gap-2 text-[var(--color-ops-muted)]">
                <Filter size={14} />

                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-9 appearance-none rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] pl-3 pr-8 text-xs font-medium text-[var(--color-ops-secondary)] outline-none focus:border-[var(--color-ops-line-strong)]"
                  >
                    <option value="All">All types</option>
                    {DISASTER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ops-muted)]"
                  />
                </div>

                <div className="relative">
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="h-9 appearance-none rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] pl-3 pr-8 text-xs font-medium text-[var(--color-ops-secondary)] outline-none focus:border-[var(--color-ops-line-strong)]"
                  >
                    <option value="All">All urgency</option>
                    {URGENCY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ops-muted)]"
                  />
                </div>
              </div>

              <p className="ml-auto text-[10px] font-mono text-[var(--color-ops-muted)]">
                {filteredIncidents.length} RECORDS · SORTED BY PRIORITY
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 mb-4 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Incident table */}
          <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-ops-line)] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                  ACTIVE INCIDENT REPORTS
                </h2>
                <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
                  Aggregated from multimodal disaster information sources
                </p>
              </div>

              <span className="text-[10px] font-mono text-[var(--color-ops-muted)]">
                LIVE FEED
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-ops-line)] bg-[var(--color-ops-raised)]">
                    <TableHeader>Incident</TableHeader>
                    <TableHeader>Location</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>People</TableHeader>
                    <TableHeader>Priority</TableHeader>
                    <TableHeader>Required Aid</TableHeader>
                    <TableHeader>Source</TableHeader>
                    <TableHeader>Updated</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-14 text-center text-xs text-[var(--color-ops-muted)]"
                      >
                        <span className="inline-block h-4 w-4 spinner rounded-full border-2 border-[var(--color-ops-line)] border-t-[var(--color-ops-safe)]" />
                        <span className="ml-2">Loading live incident intelligence...</span>
                      </td>
                    </tr>
                  )}

                  {!loading && !error && filteredIncidents.length === 0 && (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-14 text-center text-xs text-[var(--color-ops-muted)]"
                      >
                        {search || typeFilter !== "All" || urgencyFilter !== "All"
                          ? "No incidents match the active filters."
                          : "No active incidents on the live grid right now."}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    filteredIncidents.map((incident) => (
                      <IncidentRow
                        key={incident.id}
                        incident={incident}
                        onDispatch={() => setDispatchTarget({
                          latitude: Number(incident.latitude),
                          longitude: Number(incident.longitude),
                          locationLabel: incident.location,
                          urgency: incident.urgency || "High",
                          disasterType: incident.type || "General Emergency",
                          incidentId: incident.id,
                        })}
                      />
                    ))}
                </tbody>
              </table>
            </div>
          </div>

      {/* Report drawer */}
      {showReportDrawer && (
        <div className="fixed inset-0 z-[2000]">
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-ops-bg)_75%,transparent)]"
            onClick={() => setShowReportDrawer(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-[var(--color-ops-panel)] border-l border-[var(--color-ops-line)] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--color-ops-line)] px-5 py-4">
              <div>
                <h2 className="text-sm font-bold tracking-wider text-[var(--color-ops-text)]">
                  REPORT LIVE INCIDENT
                </h2>
                <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
                  Sent to the command center and fusion engine
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowReportDrawer(false)}
                className="rounded-md p-2 text-[var(--color-ops-secondary)] hover:bg-[var(--color-ops-overlay)] hover:text-[var(--color-ops-text)] transition-colors"
              >
                <X size={17} />
              </button>
            </div>

            <form
              onSubmit={handleReportSubmit}
              className="flex-1 overflow-auto p-5 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Location *">
                  <input
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Kukatpally"
                    className={inputClass}
                  />
                </DrawerField>

                <DrawerField label="State / Region">
                  <input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="e.g. Telangana"
                    className={inputClass}
                  />
                </DrawerField>

                <DrawerField label="Latitude *">
                  <input
                    required
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="17.4849"
                    className={`${inputClass} font-mono`}
                  />
                </DrawerField>

                <DrawerField label="Longitude *">
                  <input
                    required
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="78.4138"
                    className={`${inputClass} font-mono`}
                  />
                </DrawerField>

                <DrawerField label="Disaster Type">
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className={inputClass}
                  >
                    {DISASTER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </DrawerField>

                <DrawerField label="Urgency">
                  <select
                    value={form.urgency}
                    onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                    className={inputClass}
                  >
                    {URGENCY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </DrawerField>

                <DrawerField label="People Affected">
                  <input
                    type="number"
                    min="0"
                    value={form.people}
                    onChange={(e) => setForm({ ...form, people: e.target.value })}
                    placeholder="0"
                    className={`${inputClass} font-mono`}
                  />
                </DrawerField>

                <DrawerField label="Required Aid">
                  <select
                    value={form.aid}
                    onChange={(e) => setForm({ ...form, aid: e.target.value })}
                    className={inputClass}
                  >
                    <option>Rescue</option>
                    <option>Medical</option>
                    <option>Rescue + Medical</option>
                    <option>Food + Water</option>
                    <option>Evacuation</option>
                    <option>General Assistance</option>
                  </select>
                </DrawerField>
              </div>

              <DrawerField label="Source">
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className={inputClass}
                >
                  <option>Field Report</option>
                  <option>Social Media</option>
                  <option>Social Media</option>
                  <option>IoT Sensor</option>
                  <option>Satellite</option>
                </select>
              </DrawerField>

              {submitError && (
                <p className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                  {submitError}
                </p>
              )}
            </form>

            {/* Drawer actions wrap and stack, so they stay inside the panel on
                narrow screens instead of overflowing its edge. */}
            <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-ops-line)] px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReportDrawer(false)}
                block
                className="sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={handleReportSubmit}
                disabled={submitting}
                aria-busy={submitting}
                block
                className="btn-wrap sm:w-auto"
              >
                <AlertTriangle size={13} aria-hidden="true" />
                {submitting ? "Submitting…" : "Submit report"}
              </Button>
            </div>
          </aside>
        </div>
      )}

      <DispatchModal
        open={Boolean(dispatchTarget)}
        onClose={() => setDispatchTarget(null)}
        prefill={dispatchTarget || {}}
      />
    </PageShell>
  );
}

function MiniStat({ icon: Icon, title, value }) {
  return (
    <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-[var(--color-ops-muted)]">
          {title}
        </p>
        <Icon size={13} className="text-[var(--color-ops-muted)]" />
      </div>

      <p className="font-mono text-2xl font-semibold text-[var(--color-ops-text)] mt-2">
        {value}
      </p>
    </div>
  );
}

function TableHeader({ children }) {
  return (
    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-ops-muted)]">
      {children}
    </th>
  );
}

function IncidentRow({ incident, onDispatch }) {
  const priorityStyle =
    incident.priority >= 85
      ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
      : incident.priority >= 70
        ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
        : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";

  const urgencyStyle =
    incident.urgency === "Critical"
      ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
      : incident.urgency === "High"
        ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
        : "text-[var(--color-ops-secondary)] bg-[color-mix(in_srgb,var(--color-ops-secondary)_10%,transparent)] border-[color-mix(in_srgb,var(--color-ops-secondary)_30%,transparent)]";

  return (
    <tr className="border-b border-[var(--color-ops-line)] hover:bg-[var(--color-ops-overlay)] transition-colors">
      <td className="px-4 py-3.5">
        <p className="text-xs font-semibold text-[var(--color-ops-text)] font-mono">
          {incident.id}
        </p>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-[var(--color-ops-muted)] shrink-0" />

          <div>
            <span className="text-xs text-[var(--color-ops-text)]">{incident.location}</span>

            {incident.state && (
              <span className="ml-2 text-[10px] font-mono text-[var(--color-ops-muted)]">
                {incident.state}
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-xs text-[var(--color-ops-secondary)]">{incident.type}</span>
      </td>

      <td className="px-4 py-3.5">
        <span className="font-mono text-xs text-[var(--color-ops-text)]">{incident.people}</span>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-sm border font-mono text-xs font-bold ${priorityStyle}`}
          >
            {incident.priority}
          </span>

          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-bold tracking-wide ${urgencyStyle}`}
          >
            {incident.urgency.toUpperCase()}
          </span>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-xs text-[var(--color-ops-secondary)]">{incident.aid}</span>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-[11px] font-medium text-[var(--color-ops-secondary)]">{incident.source}</span>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-[11px] font-mono text-[var(--color-ops-muted)]">{incident.time}</span>
      </td>

      <td className="px-4 py-3.5">
        {Number.isFinite(Number(incident.latitude)) && Number(incident.latitude) !== 0 ? (
          <Button
            type="button"
            variant="sos"
            size="sm"
            onClick={onDispatch}
            title="Request Rescue Dispatch for this location"
          >
            <Siren size={11} aria-hidden="true" />
            Dispatch
          </Button>
        ) : (
          <span className="text-[10px] font-mono text-[var(--color-ops-muted)]">NO GPS</span>
        )}
      </td>
    </tr>
  );
}

function DrawerField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--color-ops-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default Incidents;
