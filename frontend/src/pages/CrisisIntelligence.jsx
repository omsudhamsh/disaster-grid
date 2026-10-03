import { useState } from "react";
import {
  Brain,
  MessageSquareText,
  MapPin,
  Users,
  AlertTriangle,
  HeartPulse,
  Droplets,
  Utensils,
  Truck,
  Activity,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

function analyzeMessage(message) {
  const text = message.toLowerCase();

  // Location
  const locations = [
    "kukatpally",
    "lb nagar",
    "secunderabad",
    "mehdipatnam",
    "charminar",
    "miyapur",
    "uppal",
    "begumpet",
    "hitech city",
    "dilsukhnagar",
  ];

  let location = "Unknown";
  for (const item of locations) {
    if (text.includes(item)) {
      location = item
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      break;
    }
  }

  // Disaster type
  let disaster = "General Emergency";

  if (text.includes("flood") || text.includes("water")) {
    disaster = "Flood";
  } else if (
    text.includes("fire") ||
    text.includes("burning")
  ) {
    disaster = "Fire";
  } else if (
    text.includes("collapse") ||
    text.includes("building") ||
    text.includes("damage")
  ) {
    disaster = "Structural Damage";
  } else if (
    text.includes("landslide")
  ) {
    disaster = "Landslide";
  }

  // People
  const peopleMatch = text.match(
    /(\d+)\s*(people|persons|person|families|family|members)/
  );

  const people = peopleMatch
    ? Number(peopleMatch[1])
    : 0;

  // Urgency
  let urgency = "Moderate";

  if (
    text.includes("urgent") ||
    text.includes("urgently") ||
    text.includes("trapped") ||
    text.includes("critical") ||
    text.includes("immediately")
  ) {
    urgency = "Critical";
  } else if (
    text.includes("help") ||
    text.includes("danger") ||
    text.includes("emergency")
  ) {
    urgency = "High";
  }

  // Aid
  const aid = [];

  if (
    text.includes("medical") ||
    text.includes("doctor") ||
    text.includes("injured")
  ) {
    aid.push("Medical");
  }

  if (
    text.includes("rescue") ||
    text.includes("trapped")
  ) {
    aid.push("Rescue");
  }

  if (
    text.includes("food") ||
    text.includes("hungry")
  ) {
    aid.push("Food");
  }

  if (
    text.includes("water") ||
    text.includes("thirsty")
  ) {
    aid.push("Water");
  }

  if (
    text.includes("evacuation") ||
    text.includes("evacuate")
  ) {
    aid.push("Evacuation");
  }

  if (aid.length === 0) {
    aid.push("General Assistance");
  }

  // Priority
  let priority = 50;

  if (urgency === "Critical") {
    priority += 30;
  } else if (urgency === "High") {
    priority += 20;
  }

  priority += Math.min(people, 20);

  priority = Math.min(priority, 99);

  return {
    location,
    disaster,
    people,
    urgency,
    aid,
    priority,
  };
}

function CrisisIntelligence() {
  const [message, setMessage] = useState(
    "Kukatpally lo flood water ekkuva undi, 20 people trapped, medical help urgently required"
  );

  const [result, setResult] = useState(
    analyzeMessage(
      "Kukatpally lo flood water ekkuva undi, 20 people trapped, medical help urgently required"
    )
  );

  const handleAnalyze = () => {
    setResult(analyzeMessage(message));
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex-1">
        <Header />

        <main className="p-6">
          {/* Page heading */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <Brain size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Crisis Intelligence
                </h1>

                <p className="text-sm text-slate-500">
                  AI-powered extraction and prioritization of disaster reports
                </p>
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <PipelineCard
              icon={<MessageSquareText size={20} />}
              title="Raw Report"
              text="SMS / Social Media"
            />

            <PipelineCard
              icon={<Brain size={20} />}
              title="NLP Extraction"
              text="Location + Needs"
            />

            <PipelineCard
              icon={<Activity size={20} />}
              title="Priority Engine"
              text="Severity Analysis"
            />

            <PipelineCard
              icon={<Truck size={20} />}
              title="Response"
              text="Aid Recommendation"
            />
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Input */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="font-semibold text-slate-900">
                  Incoming Crisis Report
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Simulate a message received from the field.
                </p>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-40 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter a disaster message..."
              />

              <button
                onClick={handleAnalyze}
                className="mt-4 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Brain size={18} />
                Analyze Report
              </button>
            </section>

            {/* Extraction */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="font-semibold text-slate-900">
                  AI Extraction
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Structured information extracted from the report.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InfoCard
                  icon={<MapPin size={18} />}
                  label="Location"
                  value={result.location}
                />

                <InfoCard
                  icon={<AlertTriangle size={18} />}
                  label="Disaster"
                  value={result.disaster}
                />

                <InfoCard
                  icon={<Users size={18} />}
                  label="People Affected"
                  value={
                    result.people > 0
                      ? result.people
                      : "Not specified"
                  }
                />

                <InfoCard
                  icon={<Activity size={18} />}
                  label="Urgency"
                  value={result.urgency}
                  urgent
                />
              </div>
            </section>
          </div>

          {/* Bottom */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Aid */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Required Aid
              </h2>

              <div className="mt-4 flex flex-wrap gap-3">
                {result.aid.map((item) => (
                  <AidBadge key={item} item={item} />
                ))}
              </div>
            </section>

            {/* Priority */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Priority Assessment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Calculated response priority
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-4xl font-bold text-slate-900">
                    {result.priority}
                  </div>

                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Priority Score
                  </div>
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{
                    width: `${result.priority}%`,
                  }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Response Level
                </span>

                <span className="font-semibold text-slate-900">
                  {result.urgency}
                </span>
              </div>
            </section>
          </div>

          {/* Explanation */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-slate-100 p-3">
                <Brain size={22} className="text-slate-700" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  AI Reasoning
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The report was analyzed for location, disaster type,
                  affected population, urgency indicators and requested
                  assistance. The resulting priority score can be used by
                  the response team to determine which incident requires
                  attention first.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PipelineCard({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          {icon}
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900">
            {title}
          </div>

          <div className="text-xs text-slate-500">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, urgent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}

        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>

      <div
        className={`text-sm font-semibold ${
          urgent && value === "Critical"
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function AidBadge({ item }) {
  let icon = <Truck size={16} />;

  if (item === "Medical") {
    icon = <HeartPulse size={16} />;
  }

  if (item === "Water") {
    icon = <Droplets size={16} />;
  }

  if (item === "Food") {
    icon = <Utensils size={16} />;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
      {icon}
      {item}
    </div>
  );
}

export default CrisisIntelligence;