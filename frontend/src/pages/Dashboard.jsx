import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import DisasterMap from "../components/DisasterMap";

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-100 flex">

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">

        <Header />

        <main className="flex-1 p-6 overflow-auto">

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Situation Overview
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Monitor affected areas, humanitarian needs and response activity.
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">

            <StatCard
              title="Active Incidents"
              value="24"
              subtitle="3 new in last hour"
            />

            <StatCard
              title="People Affected"
              value="347"
              subtitle="Across 18 locations"
            />

            <StatCard
              title="Critical Zones"
              value="08"
              subtitle="Immediate response"
            />

            <StatCard
              title="Response Teams"
              value="12"
              subtitle="8 currently deployed"
            />

          </div>

          {/* Main area */}
          <div className="grid grid-cols-3 gap-5 mt-5">

            {/* Map */}
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">

              <div className="p-5 border-b border-slate-200">

                <div className="flex items-center justify-between">

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Live Situation Map
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      Humanitarian priority by geographic intensity
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Live
                  </div>

                </div>

              </div>

              <div className="h-[420px]">
  <DisasterMap />
</div>

            </div>

            {/* Priority Queue */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

              <div className="p-5 border-b border-slate-200">

                <h2 className="font-semibold text-slate-900">
                  Priority Queue
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Locations requiring immediate attention
                </p>

              </div>

              <div className="p-4 space-y-3">

                <Incident
                  location="Kukatpally"
                  score="94"
                  people="32 people"
                  level="Critical"
                />

                <Incident
                  location="LB Nagar"
                  score="87"
                  people="21 people"
                  level="High"
                />

                <Incident
                  location="Secunderabad"
                  score="81"
                  people="16 people"
                  level="High"
                />

                <Incident
                  location="Mehdipatnam"
                  score="63"
                  people="12 people"
                  level="Moderate"
                />

              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="text-2xl font-semibold text-slate-900 mt-2">
        {value}
      </p>

      <p className="text-xs text-slate-400 mt-1">
        {subtitle}
      </p>

    </div>
  );
}

function Incident({ location, score, people, level }) {

  const levelStyles = {
    Critical: "text-red-600 bg-red-50",
    High: "text-amber-600 bg-amber-50",
    Moderate: "text-yellow-700 bg-yellow-50",
  };

  return (
    <div className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm font-medium text-slate-900">
            {location}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            {people}
          </p>
        </div>

        <div className="text-right">

          <p className="text-sm font-semibold text-slate-900">
            {score}
          </p>

          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${levelStyles[level]}`}
          >
            {level}
          </span>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;