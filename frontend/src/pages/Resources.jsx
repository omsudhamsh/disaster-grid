import { useMemo, useState } from "react";
import {
  Truck,
  Users,
  Package,
  HeartPulse,
  Droplets,
  Utensils,
  Radio,
  MapPin,
  ArrowUpRight,
  Clock,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

const resources = [
  {
    id: 1,
    type: "Medical Team",
    location: "Secunderabad",
    available: 4,
    total: 6,
    status: "Available",
    icon: HeartPulse,
  },
  {
    id: 2,
    type: "Rescue Team",
    location: "Kukatpally",
    available: 3,
    total: 5,
    status: "Deployed",
    icon: Users,
  },
  {
    id: 3,
    type: "Water Supply",
    location: "LB Nagar",
    available: 12,
    total: 20,
    status: "Available",
    icon: Droplets,
  },
  {
    id: 4,
    type: "Food Packets",
    location: "Mehdipatnam",
    available: 850,
    total: 1200,
    status: "Available",
    icon: Utensils,
  },
  {
    id: 5,
    type: "Emergency Vehicles",
    location: "Charminar",
    available: 5,
    total: 8,
    status: "Available",
    icon: Truck,
  },
  {
    id: 6,
    type: "Communication Unit",
    location: "Miyapur",
    available: 2,
    total: 3,
    status: "Deployed",
    icon: Radio,
  },
];

const incidents = [
  {
    id: "INC-001",
    location: "Kukatpally",
    need: "Rescue + Medical",
    priority: 94,
    people: 32,
    time: "8 min ago",
  },
  {
    id: "INC-002",
    location: "LB Nagar",
    need: "Food + Water",
    priority: 87,
    people: 21,
    time: "14 min ago",
  },
  {
    id: "INC-003",
    location: "Secunderabad",
    need: "Medical",
    priority: 81,
    people: 16,
    time: "19 min ago",
  },
  {
    id: "INC-005",
    location: "Charminar",
    need: "Evacuation",
    priority: 72,
    people: 18,
    time: "31 min ago",
  },
];

function Resources() {
  const [selected, setSelected] = useState(null);

  const criticalIncidents = useMemo(
    () => incidents.filter((item) => item.priority >= 80),
    []
  );

  const availableUnits = resources.reduce(
    (sum, item) => sum + item.available,
    0
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex-1">
        <Header />

        <main className="p-6">

          {/* Heading */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <Truck size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Response Resources
                </h1>

                <p className="text-sm text-slate-500">
                  Monitor and allocate emergency response resources
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

            <SummaryCard
              title="Available Units"
              value={availableUnits}
              subtitle="Across response network"
              icon={<Truck size={20} />}
            />

            <SummaryCard
              title="Priority Incidents"
              value={criticalIncidents.length}
              subtitle="Require immediate attention"
              icon={<MapPin size={20} />}
            />

            <SummaryCard
              title="People Requiring Aid"
              value={criticalIncidents.reduce(
                (sum, item) => sum + item.people,
                0
              )}
              subtitle="Across priority zones"
              icon={<Users size={20} />}
            />

          </div>

          {/* Allocation */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

            {/* Priority Queue */}
            <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="mb-5">
                <h2 className="font-semibold text-slate-900">
                  Recommended Deployments
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Resource allocation based on incident priority and reported needs
                </p>
              </div>

              <div className="space-y-3">

                {criticalIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex items-start gap-3">

                        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                          <MapPin size={18} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {incident.location}
                            </h3>

                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                              {incident.id}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {incident.people} people affected · {incident.time}
                          </p>
                        </div>

                      </div>

                      <div className="flex flex-wrap items-center gap-2">

                        {incident.need
                          .split(" + ")
                          .map((need) => (
                            <span
                              key={need}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
                            >
                              {need}
                            </span>
                          ))}

                        <span className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                          Priority {incident.priority}
                        </span>

                      </div>

                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={14} />
                        Response recommendation generated
                      </div>

                      <button
                        onClick={() => setSelected(incident)}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-900 hover:underline"
                      >
                        View allocation
                        <ArrowUpRight size={14} />
                      </button>

                    </div>

                  </div>
                ))}

              </div>
            </section>

            {/* Allocation Detail */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="font-semibold text-slate-900">
                Allocation Detail
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select an incident to inspect the recommendation
              </p>

              {!selected ? (
                <div className="flex min-h-72 items-center justify-center text-center">

                  <div>
                    <Package
                      size={40}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm font-medium text-slate-500">
                      No incident selected
                    </p>
                  </div>

                </div>
              ) : (
                <div className="mt-6">

                  <div className="rounded-xl bg-slate-900 p-5 text-white">

                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Selected Incident
                    </div>

                    <div className="mt-2 text-xl font-bold">
                      {selected.location}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      {selected.id}
                    </div>

                  </div>

                  <div className="mt-4 space-y-3">

                    <AllocationItem
                      icon={<Users size={17} />}
                      title="Response Team"
                      value="1 Rescue Team"
                    />

                    <AllocationItem
                      icon={<HeartPulse size={17} />}
                      title="Medical Support"
                      value={
                        selected.need.includes("Medical")
                          ? "1 Medical Team"
                          : "Standby"
                      }
                    />

                    <AllocationItem
                      icon={<Truck size={17} />}
                      title="Emergency Vehicle"
                      value="1 Vehicle"
                    />

                    <AllocationItem
                      icon={<Radio size={17} />}
                      title="Communication"
                      value="Priority Channel"
                    />

                  </div>

                  <button className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                    Confirm Deployment
                  </button>

                </div>
              )}

            </section>
          </div>

          {/* Resource Inventory */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Resource Inventory
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current availability across the response network
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

              {resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                />
              ))}

            </div>

          </section>

        </main>
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          {icon}
        </div>

        <span className="text-sm text-slate-500">
          {title}
        </span>

      </div>

      <div className="mt-4 text-3xl font-bold text-slate-900">
        {value}
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {subtitle}
      </p>

    </div>
  );
}

function ResourceCard({ resource }) {
  const Icon = resource.icon;

  const percentage =
    (resource.available / resource.total) * 100;

  return (
    <div className="rounded-xl border border-slate-200 p-4">

      <div className="flex items-start justify-between">

        <div className="flex items-center gap-3">

          <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
            <Icon size={18} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {resource.type}
            </h3>

            <p className="text-xs text-slate-500">
              {resource.location}
            </p>
          </div>

        </div>

        <span
          className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
            resource.status === "Available"
              ? "bg-slate-100 text-slate-700"
              : "bg-slate-900 text-white"
          }`}
        >
          {resource.status}
        </span>

      </div>

      <div className="mt-5 flex items-end justify-between">

        <div>
          <div className="text-2xl font-bold text-slate-900">
            {resource.available}
          </div>

          <div className="text-xs text-slate-500">
            of {resource.total} available
          </div>
        </div>

        <div className="text-xs font-medium text-slate-500">
          {Math.round(percentage)}%
        </div>

      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${percentage}%` }}
        />
      </div>

    </div>
  );
}

function AllocationItem({ icon, title, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">

      <div className="flex items-center gap-3">

        <div className="text-slate-600">
          {icon}
        </div>

        <span className="text-sm text-slate-600">
          {title}
        </span>

      </div>

      <span className="text-xs font-semibold text-slate-900">
        {value}
      </span>

    </div>
  );
}

export default Resources;