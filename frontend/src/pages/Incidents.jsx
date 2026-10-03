import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  AlertTriangle,
  MapPin,
  Users,
  Clock3,
  Search,
  Filter,
} from "lucide-react";

function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadIncidents() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/incidents/"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch incidents");
        }

        const data = await response.json();

        setIncidents(data.incidents);
      } catch (err) {
        console.error(err);
        setError("Unable to connect to Disaster Grid backend.");
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
  }, []);

  const filteredIncidents = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return incidents;
    }

    return incidents.filter((incident) => {
      return (
        incident.id?.toLowerCase().includes(query) ||
        incident.location?.toLowerCase().includes(query) ||
        incident.type?.toLowerCase().includes(query) ||
        incident.source?.toLowerCase().includes(query) ||
        incident.aid?.toLowerCase().includes(query)
      );
    });
  }, [incidents, search]);

  const criticalCount = incidents.filter(
    (incident) => incident.urgency === "Critical"
  ).length;

  const peopleAffected = incidents.reduce(
    (total, incident) => total + Number(incident.people || 0),
    0
  );

  const locationsCount = new Set(
    incidents.map((incident) => incident.location)
  ).size;

  return (
    <div className="min-h-screen bg-slate-100 flex">

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">

        <Header />

        <main className="flex-1 p-6 overflow-auto">

          {/* Page Heading */}
          <div className="flex items-start justify-between mb-6">

            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Live Incidents
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Monitor and prioritize incoming disaster reports.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />

              {loading
                ? "Loading..."
                : `${incidents.length} active incidents`}
            </div>

          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-5">

            <SummaryCard
              icon={AlertTriangle}
              title="Critical"
              value={loading ? "--" : String(criticalCount).padStart(2, "0")}
              description="Immediate response"
            />

            <SummaryCard
              icon={Users}
              title="People affected"
              value={loading ? "--" : peopleAffected}
              description="Across active incidents"
            />

            <SummaryCard
              icon={MapPin}
              title="Locations"
              value={loading ? "--" : locationsCount}
              description="Affected areas"
            />

            <SummaryCard
              icon={Clock3}
              title="New reports"
              value={loading ? "--" : incidents.length}
              description="Currently monitored"
            />

          </div>

          {/* Search / Filter */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="relative">

                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search location or incident..."
                    className="w-72 h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
                  />

                </div>

                <button
                  type="button"
                  className="h-9 px-3 flex items-center gap-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Filter size={15} />
                  Filter
                </button>

              </div>

              <p className="text-xs text-slate-400">
                Sorted by humanitarian priority
              </p>

            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Incident Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

            <div className="px-5 py-4 border-b border-slate-200">

              <h2 className="font-semibold text-slate-900">
                Active Incident Reports
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                Aggregated from multimodal disaster information sources
              </p>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">

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

                  {/* Loading */}
                  {loading && (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Loading incident intelligence...
                      </td>
                    </tr>
                  )}

                  {/* No results */}
                  {!loading &&
                    !error &&
                    filteredIncidents.length === 0 && (
                      <tr>
                        <td
                          colSpan="8"
                          className="px-5 py-12 text-center text-sm text-slate-500"
                        >
                          {search
                            ? "No incidents match your search."
                            : "No active incidents found."}
                        </td>
                      </tr>
                    )}

                  {/* Incident Rows */}
                  {!loading &&
                    !error &&
                    filteredIncidents.map((incident) => (
                      <IncidentRow
                        key={incident.id}
                        incident={incident}
                      />
                    ))}

                </tbody>

              </table>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}


/* ----------------------------- */
/* Summary Card                  */
/* ----------------------------- */

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="text-2xl font-semibold text-slate-900 mt-2">
            {value}
          </p>

          <p className="text-xs text-slate-400 mt-1">
            {description}
          </p>

        </div>

        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon size={18} className="text-slate-600" />
        </div>

      </div>

    </div>
  );
}


/* ----------------------------- */
/* Table Header                  */
/* ----------------------------- */

function TableHeader({ children }) {
  return (
    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}


/* ----------------------------- */
/* Incident Row                  */
/* ----------------------------- */

function IncidentRow({ incident }) {

  const priorityStyle =
    incident.priority >= 85
      ? "text-red-700 bg-red-50"
      : incident.priority >= 70
        ? "text-orange-700 bg-orange-50"
        : "text-yellow-700 bg-yellow-50";

  const urgencyStyle =
    incident.urgency === "Critical"
      ? "text-red-700 bg-red-50"
      : incident.urgency === "High"
        ? "text-orange-700 bg-orange-50"
        : "text-yellow-700 bg-yellow-50";

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition">

      {/* Incident */}
      <td className="px-5 py-4">

        <p className="text-sm font-medium text-slate-900">
          {incident.id}
        </p>

      </td>


      {/* Location */}
      <td className="px-5 py-4">

        <div className="flex items-center gap-2">

          <MapPin
            size={14}
            className="text-slate-400"
          />

          <span className="text-sm text-slate-700">
            {incident.location}
          </span>

        </div>

      </td>


      {/* Type */}
      <td className="px-5 py-4">

        <span className="text-sm text-slate-600">
          {incident.type}
        </span>

      </td>


      {/* People */}
      <td className="px-5 py-4">

        <span className="text-sm text-slate-700">
          {incident.people}
        </span>

      </td>


      {/* Priority */}
      <td className="px-5 py-4">

        <div className="flex items-center gap-2">

          <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${priorityStyle}`}
          >
            {incident.priority}
          </span>

          <span
            className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium ${urgencyStyle}`}
          >
            {incident.urgency}
          </span>

        </div>

      </td>


      {/* Required Aid */}
      <td className="px-5 py-4">

        <span className="text-sm text-slate-600">
          {incident.aid}
        </span>

      </td>


      {/* Source */}
      <td className="px-5 py-4">

        <span className="text-xs text-slate-500">
          {incident.source}
        </span>

      </td>


      {/* Updated */}
      <td className="px-5 py-4">

        <span className="text-xs text-slate-400">
          {incident.time}
        </span>

      </td>

    </tr>
  );
}

export default Incidents;