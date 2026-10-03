import { useEffect, useState } from "react";

import {
  Brain,
  MessageSquareText,
  Satellite,
  Radio,
  GitMerge,
  MapPin,
  Users,
  AlertTriangle,
  Activity,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

function Fusion() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/fusion/")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Fusion API failed");
        }

        return response.json();
      })
      .then((result) => {
        setData(result.fusion);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fusion API error:", err);
        setError(true);
        setLoading(false);
      });
  }, []);

  /*
    Loading state
  */
  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />

        <div className="flex-1">
          <Header />

          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

              <p className="mt-4 text-sm text-slate-500">
                Loading fusion intelligence...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
    Error state
  */
  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />

        <div className="flex-1">
          <Header />

          <main className="p-6">
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <AlertTriangle
                size={40}
                className="mx-auto text-red-500"
              />

              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Unable to load fusion intelligence
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Make sure the Disaster Grid backend is running.
              </p>

              <p className="mt-3 text-xs text-slate-400">
                API: http://127.0.0.1:8000/api/fusion/
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex-1">
        <Header />

        <main className="p-6">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <GitMerge size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Multimodal Fusion
                </h1>

                <p className="text-sm text-slate-500">
                  Combine heterogeneous disaster signals into a unified
                  response intelligence layer
                </p>
              </div>

            </div>
          </div>

          {/* Pipeline */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">

            <PipelineCard
              icon={<MessageSquareText size={20} />}
              title="Crisis Reports"
              text="NLP Extraction"
            />

            <PipelineCard
              icon={<Satellite size={20} />}
              title="Imagery"
              text="Vision Analysis"
            />

            <PipelineCard
              icon={<Radio size={20} />}
              title="Sensors"
              text="Live Readings"
            />

            <PipelineCard
              icon={<GitMerge size={20} />}
              title="Fusion Engine"
              text="Unified Priority"
            />

          </div>

          {/* Incoming Intelligence */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Incoming Intelligence
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Independent observations associated with the highest-priority
                incident
              </p>
            </div>

            <div className="space-y-3">

              {data.sources.map((item, index) => (
                <SourceCard
                  key={index}
                  item={item}
                  index={index}
                />
              ))}

            </div>

          </section>

          {/* Fusion Result */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-slate-100 p-2">
                <Brain
                  size={20}
                  className="text-slate-700"
                />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Fusion Engine Output
                </h2>

                <p className="text-sm text-slate-500">
                  Cross-source evidence assessment
                </p>
              </div>

            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">

              <Metric
                icon={<MapPin size={18} />}
                label="Location"
                value={data.location}
              />

              <Metric
                icon={<Users size={18} />}
                label="People Affected"
                value={data.people_affected}
              />

              <Metric
                icon={<AlertTriangle size={18} />}
                label="Severity"
                value={data.severity}
              />

              <Metric
                icon={<Activity size={18} />}
                label="Priority"
                value={data.priority}
              />

            </div>

          </section>

          {/* Evidence + Explainability */}
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Cross-source agreement */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="font-semibold text-slate-900">
                Cross-Source Agreement
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Confidence increases when independent sources report
                consistent conditions.
              </p>

              <div className="mt-6">

                <div className="mb-2 flex justify-between text-sm">

                  <span className="text-slate-500">
                    Evidence consistency
                  </span>

                  <span className="font-semibold text-slate-900">
                    {data.confidence}%
                  </span>

                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-700"
                    style={{
                      width: `${data.confidence}%`,
                    }}
                  />

                </div>

              </div>

              <div className="mt-5 space-y-3">

                <Evidence
                  label="Location agreement"
                  value="Confirmed"
                />

                <Evidence
                  label="Disaster type"
                  value={data.disaster_type}
                />

                <Evidence
                  label="Evidence sources"
                  value={`${data.source_count} sources`}
                />

              </div>

            </section>

            {/* Explainability */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="font-semibold text-slate-900">
                Explainable Priority
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Factors contributing to the unified priority score
              </p>

              <div className="mt-5 space-y-3">

                <Reason
                  title="Human impact"
                  text={`${data.people_affected} people are reported as affected in ${data.location}.`}
                />

                <Reason
                  title="Incident severity"
                  text={`${data.disaster_type} has been classified as ${data.severity}.`}
                />

                <Reason
                  title="Multi-source evidence"
                  text={`${data.source_count} independent data sources contributed to the assessment.`}
                />

                <Reason
                  title="Priority calculation"
                  text={`The unified response priority is ${data.priority}/100.`}
                />

              </div>

            </section>

          </section>

          {/* Final Response */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white">

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div className="flex items-start gap-4">

                <div className="rounded-xl bg-white/10 p-3">
                  <ShieldAlert size={24} />
                </div>

                <div>

                  <div className="text-xs uppercase tracking-wider text-slate-400">
                    Recommended Response
                  </div>

                  <h2 className="mt-1 text-xl font-bold">
                    {data.recommendation}
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Multiple disaster intelligence signals have been
                    consolidated into a unified assessment for response
                    coordination and field verification.
                  </p>

                </div>

              </div>

              <div className="text-left md:text-right">

                <div className="text-4xl font-bold">
                  {data.priority}
                </div>

                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Unified Priority
                </div>

              </div>

            </div>

          </section>

          {/* API status */}
          <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-400">

            <CheckCircle size={14} />

            Fusion API connected

          </div>

        </main>
      </div>
    </div>
  );
}


/* -------------------------------- */
/* Pipeline Card */
/* -------------------------------- */

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


/* -------------------------------- */
/* Source Card */
/* -------------------------------- */

function SourceCard({ item, index }) {

  let Icon = MessageSquareText;

  if (index === 1) {
    Icon = Satellite;
  }

  if (index === 2) {
    Icon = Radio;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">

      <div className="flex items-center gap-3">

        <div className="rounded-lg bg-slate-100 p-3 text-slate-700">
          <Icon size={19} />
        </div>

        <div>

          <h3 className="text-sm font-semibold text-slate-900">
            {item.name}
          </h3>

          <p className="text-xs text-slate-500">
            {item.type}
          </p>

        </div>

      </div>

      <div className="flex flex-wrap items-center gap-3">

        <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {item.signal}
        </span>

      </div>

    </div>
  );
}


/* -------------------------------- */
/* Metric */
/* -------------------------------- */

function Metric({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <div className="flex items-center gap-2 text-slate-500">

        {icon}

        <span className="text-xs uppercase tracking-wide">
          {label}
        </span>

      </div>

      <div className="mt-3 text-xl font-bold text-slate-900">
        {value}
      </div>

    </div>
  );
}


/* -------------------------------- */
/* Evidence */
/* -------------------------------- */

function Evidence({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">

      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">

        <CheckCircle size={15} />

        {value}

      </span>

    </div>
  );
}


/* -------------------------------- */
/* Reason */
/* -------------------------------- */

function Reason({ title, text }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">

      <div className="text-sm font-semibold text-slate-900">
        {title}
      </div>

      <div className="mt-1 text-xs leading-5 text-slate-500">
        {text}
      </div>

    </div>
  );
}


export default Fusion;