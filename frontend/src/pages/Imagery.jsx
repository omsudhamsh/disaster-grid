import { useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  Brain,
  Building2,
  AlertTriangle,
  CheckCircle,
  Activity,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

function Imagery() {
  const [image, setImage] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setImage(URL.createObjectURL(file));
    setAnalyzed(false);
  };

  const analyzeImage = () => {
    if (!image) return;

    setAnalyzed(true);
  };

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
                <ImageIcon size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Imagery Analysis
                </h1>

                <p className="text-sm text-slate-500">
                  AI-assisted damage assessment from satellite and drone imagery
                </p>
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <PipelineCard
              icon={<Upload size={20} />}
              title="Image Input"
              text="Satellite / Drone"
            />

            <PipelineCard
              icon={<Brain size={20} />}
              title="Vision Analysis"
              text="Damage Detection"
            />

            <PipelineCard
              icon={<Activity size={20} />}
              title="Assessment"
              text="Severity Estimation"
            />
          </div>

          {/* Main */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Upload */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Disaster Imagery
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload an image captured from a satellite or drone.
              </p>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition hover:border-slate-400">
                <Upload size={30} className="text-slate-500" />

                <span className="mt-3 text-sm font-medium text-slate-700">
                  Click to upload imagery
                </span>

                <span className="mt-1 text-xs text-slate-500">
                  JPG, PNG or WebP
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {image && (
                <div className="mt-5">
                  <img
                    src={image}
                    alt="Uploaded disaster imagery"
                    className="max-h-80 w-full rounded-xl object-cover"
                  />

                  <button
                    onClick={analyzeImage}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Brain size={18} />
                    Analyze Imagery
                  </button>
                </div>
              )}
            </section>

            {/* Results */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    AI Damage Assessment
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Computer vision assessment results
                  </p>
                </div>

                {analyzed && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">
                    <CheckCircle size={15} />
                    Analysis Complete
                  </div>
                )}
              </div>

              {!analyzed ? (
                <div className="flex min-h-80 items-center justify-center">
                  <div className="text-center">
                    <Building2
                      size={42}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-4 text-sm font-medium text-slate-500">
                      No analysis available
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Upload imagery and run the AI assessment
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <ResultCard
                    label="Detected Damage"
                    value="Severe Structural Damage"
                    icon={<Building2 size={20} />}
                  />

                  <ResultCard
                    label="Affected Structures"
                    value="18 Buildings"
                    icon={<AlertTriangle size={20} />}
                  />

                  <ResultCard
                    label="Estimated Severity"
                    value="82 / 100"
                    icon={<Activity size={20} />}
                  />

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-500">
                        Damage Confidence
                      </span>

                      <span className="font-semibold text-slate-900">
                        91%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-slate-900"
                        style={{ width: "91%" }}
                      />
                    </div>
                  </div>
                </div>
              )}
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
                  Explainable Assessment
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  The vision module identifies visible structural damage,
                  estimates affected buildings and produces a severity score.
                  These results can later be combined with crisis reports and
                  sensor observations through the Disaster Grid fusion engine.
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

function ResultCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="rounded-lg bg-white p-3 text-slate-700">
        {icon}
      </div>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </div>

        <div className="mt-1 text-sm font-semibold text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

export default Imagery;