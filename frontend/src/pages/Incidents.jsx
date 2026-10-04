import { useEffect, useMemo, useState } from "react";
import { useAuth, SignInButton } from "@clerk/react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  AlertTriangle,
  MapPin,
  Users,
  Clock3,
  Search,
  Filter,
  Plus,
  X,
  Lock,
  ChevronDown,
} from "lucide-react";
import { reportIncident } from "../services/incidentServices";

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
  "h-10 w-full rounded-md border border-[#1e293b] bg-[#0b1424] px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-600";

function Incidents() {
  const { isSignedIn } = useAuth();
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

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/incidents/");

        if (!response.ok) {
          throw new Error("Failed to fetch incidents");
        }

        const data = await response.json();

        if (!active) {
          return;
        }

        setIncidents(data.incidents);
      } catch (err) {
        console.error(err);
        if (active) {
          setError("Unable to connect to Disaster Grid backend.");
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
    <div className="min-h-screen bg-[#0f172a] flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          {/* Page heading */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-100 tracking-wide">
                LIVE INCIDENTS
              </h1>

              <p className="text-xs text-slate-500 mt-1">
                Monitor and prioritize incoming disaster reports.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {loading ? "SYNCING" : `${incidents.length} ACTIVE`}
              </div>

              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => setShowReportDrawer(true)}
                  className="flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-white"
                >
                  <Plus size={14} />
                  REPORT INCIDENT
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="flex items-center gap-2 rounded-md border border-[#1e293b] bg-[#0b1424] px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-[#131f38]">
                    <Lock size={13} />
                    SIGN IN TO REPORT
                  </button>
                </SignInButton>
              )}
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-4 gap-4 mb-4">
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
          <div className="rounded-md border border-[#1e293b] bg-[#0f172a] p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, location, type, source..."
                  className="h-9 w-full rounded-md border border-[#1e293b] bg-[#0b1424] pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-500"
                />
              </div>

              <div className="flex items-center gap-2 text-slate-500">
                <Filter size={14} />

                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-9 appearance-none rounded-md border border-[#1e293b] bg-[#0b1424] pl-3 pr-8 text-xs font-medium text-slate-300 outline-none focus:border-slate-500"
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
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                </div>

                <div className="relative">
                  <select
                    value={urgencyFilter}
                    onChange={(e) => setUrgencyFilter(e.target.value)}
                    className="h-9 appearance-none rounded-md border border-[#1e293b] bg-[#0b1424] pl-3 pr-8 text-xs font-medium text-slate-300 outline-none focus:border-slate-500"
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
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"
                  />
                </div>
              </div>

              <p className="ml-auto text-[10px] font-mono text-slate-600">
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
          <div className="rounded-md border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  ACTIVE INCIDENT REPORTS
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Aggregated from multimodal disaster information sources
                </p>
              </div>

              <span className="text-[10px] font-mono text-slate-600">
                LIVE FEED
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e293b] bg-[#0b1424]">
                    <TableHeader>Incident</TableHeader>
                    <TableHeader>Location</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>People</TableHeader>
                    <TableHeader>Priority</TableHeader>
                    <TableHeader>Required Aid</TableHeader>
                    <TableHeader>Source</TableHeader>
                    <TableHeader>Updated</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-14 text-center text-xs text-slate-500"
                      >
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-500" />
                        <span className="ml-2">Loading incident intelligence...</span>
                      </td>
                    </tr>
                  )}

                  {!loading && !error && filteredIncidents.length === 0 && (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-14 text-center text-xs text-slate-500"
                      >
                        {search || typeFilter !== "All" || urgencyFilter !== "All"
                          ? "No incidents match the active filters."
                          : "No active incidents found."}
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    !error &&
                    filteredIncidents.map((incident) => (
                      <IncidentRow key={incident.id} incident={incident} />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Report drawer */}
      {showReportDrawer && (
        <div className="fixed inset-0 z-[2000]">
          <div
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setShowReportDrawer(false)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-[#0f172a] border-l border-[#1e293b] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-[#1e293b] px-5 py-4">
              <div>
                <h2 className="text-sm font-bold tracking-wider text-slate-100">
                  REPORT LIVE INCIDENT
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sent to the command center and fusion engine
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowReportDrawer(false)}
                className="rounded-md p-2 text-slate-400 hover:bg-[#131f38] hover:text-slate-200 transition-colors"
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
                  <option>SMS</option>
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

            <div className="flex justify-end gap-3 border-t border-[#1e293b] px-5 py-4">
              <button
                type="button"
                onClick={() => setShowReportDrawer(false)}
                className="rounded-md border border-[#1e293b] bg-[#0b1424] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-[#131f38] transition-colors"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleReportSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-white transition-colors disabled:opacity-50"
              >
                <AlertTriangle size={13} />
                {submitting ? "SUBMITTING..." : "SUBMIT REPORT"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, title, value }) {
  return (
    <div className="rounded-md border border-[#1e293b] bg-[#0f172a] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-slate-500">
          {title}
        </p>
        <Icon size={13} className="text-slate-500" />
      </div>

      <p className="font-mono text-2xl font-semibold text-slate-100 mt-2">
        {value}
      </p>
    </div>
  );
}

function TableHeader({ children }) {
  return (
    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function IncidentRow({ incident }) {
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
        : "text-slate-300 bg-slate-500/10 border-slate-500/30";

  return (
    <tr className="border-b border-[#1e293b] hover:bg-[#131f38] transition-colors">
      <td className="px-4 py-3.5">
        <p className="text-xs font-semibold text-slate-200 font-mono">
          {incident.id}
        </p>
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-slate-500 shrink-0" />

          <div>
            <span className="text-xs text-slate-200">{incident.location}</span>

            {incident.state && (
              <span className="ml-2 text-[10px] font-mono text-slate-600">
                {incident.state}
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-xs text-slate-300">{incident.type}</span>
      </td>

      <td className="px-4 py-3.5">
        <span className="font-mono text-xs text-slate-200">{incident.people}</span>
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
        <span className="text-xs text-slate-300">{incident.aid}</span>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-[11px] text-slate-500">{incident.source}</span>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-[11px] font-mono text-slate-500">{incident.time}</span>
      </td>
    </tr>
  );
}

function DrawerField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export default Incidents;
