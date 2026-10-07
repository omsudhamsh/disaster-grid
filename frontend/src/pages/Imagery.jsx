import { useRef, useState } from "react";
import PageShell from "../components/PageShell";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Building2,
  AlertTriangle,
  CheckCircle,
  X,
  CloudUpload,
  Boxes,
  Gauge,
  Database,
  Satellite,
  Globe2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiUpload, apiPost } from "../services/api";

const DISASTER_CATEGORIES = [
  "Flood",
  "Earthquake",
  "Cyclone",
  "Wildfire",
  "Structural Damage",
];

const INDIA_PRESETS = [
  { name: "Hyderabad, Telangana", latitude: 17.385, longitude: 78.4867 },
  { name: "Chennai, Tamil Nadu", latitude: 13.0827, longitude: 80.2707 },
  { name: "Kochi, Kerala", latitude: 9.9312, longitude: 76.2673 },
  { name: "Mumbai, Maharashtra", latitude: 19.076, longitude: 72.8777 },
  { name: "Guwahati, Assam", latitude: 26.1445, longitude: 91.7362 },
  { name: "Bhubaneswar, Odisha", latitude: 20.2961, longitude: 85.8245 },
  { name: "Srinagar, J&K", latitude: 34.0837, longitude: 74.7973 },
  { name: "Port Blair, A&N", latitude: 11.6234, longitude: 92.7265 },
];

const MODE_NASA = "nasa";
const MODE_UPLOAD = "upload";

function Imagery() {
  const [mode, setMode] = useState(MODE_NASA);

  return (
    <PageShell >
          {/* Heading */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-ops-line-strong)] bg-[var(--color-ops-raised)] text-[var(--color-ops-text)]">
                <Satellite size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-wide text-[var(--color-ops-text)]">
                  Imagery Analysis
                </h1>
                <p className="mt-0.5 text-xs text-[var(--color-ops-muted)]">
                  Satellite captures and drone imagery · vision-based
                  damage assessment · India-only
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="badge badge-info">SATELLITE + OPTICAL FEEDS</span>
              <span className="badge badge-safe">
                <span className="live-dot live-dot--live" aria-hidden="true" />
                LIVE FEEDS
              </span>
            </div>
          </div>

          {/* Mode switch — segmented control, wraps on narrow viewports */}
          <div
            role="group"
            aria-label="Imagery source"
            className="mb-6 flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-1"
          >
            {[
              [MODE_NASA, "Satellite capture", Satellite],
              [MODE_UPLOAD, "Upload imagery", CloudUpload],
            ].map(([value, label, Icon]) => {
              const active = mode === value;
              return (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "ghost"}
                  aria-pressed={active}
                  onClick={() => setMode(value)}
                  className="min-w-0 px-4 tracking-wide"
                >
                  <Icon size={13} aria-hidden="true" />
                  <span className="min-w-0 truncate">{label}</span>
                </Button>
              );
            })}
          </div>

          {mode === MODE_NASA ? <NasaCapturePanel /> : <UploadPanel />}
    </PageShell>
  );
}

/* ================================================================
   NASA SATELLITE CAPTURE — direct NASA API pipeline
   ================================================================ */

function NasaCapturePanel() {
  const [preset, setPreset] = useState(0);
  const [latitude, setLatitude] = useState(String(INDIA_PRESETS[0].latitude));
  const [longitude, setLongitude] = useState(String(INDIA_PRESETS[0].longitude));
  const [location, setLocation] = useState(INDIA_PRESETS[0].name);
  const [category, setCategory] = useState("");
  const [zoom, setZoom] = useState(9);

  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const applyPreset = (index) => {
    const item = INDIA_PRESETS[index];
    setPreset(index);
    setLatitude(String(item.latitude));
    setLongitude(String(item.longitude));
    setLocation(item.name);
  };

  const runCapture = async () => {
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const data = await apiPost("/api/imagery/nasa/analyze", {
        latitude: Number(latitude),
        longitude: Number(longitude),
        location,
        disaster_category: category || null,
        zoom,
      });
      setAnalysis(data);
    } catch (captureError) {
      const detail = captureError.message || "Satellite capture failed.";
      setError(
        detail.includes("India")
          ? "Satellite analysis is restricted to locations inside India."
          : detail
      );
    } finally {
      setLoading(false);
    }
  };

  const severity = analysis?.result?.severity_score ?? 0;
  const severityTone =
    severity >= 80
      ? "text-[var(--color-ops-crit)]"
      : severity >= 50
        ? "text-[var(--color-ops-warn)]"
        : "text-[var(--color-ops-safe)]";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Capture controls */}
      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--color-ops-line)] px-4 py-3">
          <h2 className="panel-title">SATELLITE CAPTURE</h2>
          <p className="panel-sub mt-0.5">
            Live true-colour satellite imagery, then assessed by a vision
            model
          </p>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <span className="field-label">Location presets (India)</span>
            <div className="flex flex-wrap gap-2">
              {INDIA_PRESETS.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => applyPreset(index)}
                  className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    preset === index
                      ? "border-[var(--color-ops-accent-dim)] bg-[var(--color-ops-accent-dim)] text-[var(--color-ops-info-text)]"
                      : "border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] text-[var(--color-ops-secondary)] hover:text-[var(--color-ops-text)]"
                  }`}
                >
                  {item.name.split(",")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Latitude</span>
              <input
                value={latitude}
                onChange={(event) => {
                  setLatitude(event.target.value);
                  setPreset(-1);
                }}
                className="field-input"
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="field-label">Longitude</span>
              <input
                value={longitude}
                onChange={(event) => {
                  setLongitude(event.target.value);
                  setPreset(-1);
                }}
                className="field-input"
                inputMode="decimal"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Location reference</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Kukatpally, Telangana"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Disaster category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="field-input"
              >
                <option value="">Auto-classify</option>
                {DISASTER_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="field-label">Capture zoom ({zoom} · ~{Math.round(40075 * Math.cos(latitude * Math.PI / 180) / 2 ** zoom)} km wide tile)</span>
            <input
              type="range"
              min={5}
              max={9}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-[var(--color-ops-accent)]"
            />
          </label>

          <button
            type="button"
            onClick={runCapture}
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <Loader2 size={14} className="spinner" />
            ) : (
              <Satellite size={14} />
            )}
            {loading ? "FETCHING SATELLITE IMAGERY + ANALYZING…" : "CAPTURE & ANALYZE"}
          </button>

          <p className="flex items-start gap-2 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--color-ops-secondary)]">
            <Globe2 size={13} className="mt-0.5 shrink-0 text-[var(--color-ops-accent)]" />
            Coordinates outside India are rejected by the platform. Satellite
            true-colour imagery (previous UTC day) with higher-resolution
            optical imagery attempted for dated queries.
          </p>
        </div>
      </section>

      {/* Capture result */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-ops-line)] px-4 py-3">
          <div>
            <h2 className="panel-title">SATELLITE DAMAGE ASSESSMENT</h2>
            <p className="panel-sub mt-0.5">Vision output over the satellite capture</p>
          </div>
          {analysis?.result && (
            <span className="badge badge-safe">
              <CheckCircle size={11} />
              {analysis.provider === "gemini" ? "ANALYSIS COMPLETE" : "CAPTURE OK · VISION BUSY"}
            </span>
          )}
        </div>

        <div className="p-4">
          {!analysis && !loading && (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <Satellite size={34} className="text-[var(--color-ops-line-strong)]" />
              <p className="mt-4 text-xs font-semibold text-[var(--color-ops-secondary)]">
                No satellite capture yet
              </p>
              <p className="mt-1 font-mono text-[10px] text-[var(--color-ops-muted)]">
                PICK AN INDIAN LOCATION AND RUN CAPTURE &amp; ANALYZE
              </p>
            </div>
          )}

          {loading && (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <Loader2 size={26} className="spinner text-[var(--color-ops-accent)]" />
              <p className="mt-4 text-xs text-[var(--color-ops-secondary)]">
                Contacting satellite feed · fetching true-colour capture…
              </p>
              <p className="mt-1 font-mono text-[10px] text-[var(--color-ops-muted)]">
                THEN VISION MODEL CLASSIFIES DAMAGE
              </p>
            </div>
          )}

          {error && !loading && (
            <p className="rounded-md border border-[color-mix(in_srgb,var(--color-ops-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-crit)_10%,transparent)] p-3 text-xs text-[var(--color-ops-crit-text)]">
              {error}
            </p>
          )}

          {analysis && (
            <div className="space-y-3">
              {analysis.image_data_url && (
                <div className="relative overflow-hidden rounded-md border border-[var(--color-ops-line)]">
                  <img
                    src={analysis.image_data_url}
                    alt="Satellite capture"
                    className="max-h-72 w-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 rounded bg-[var(--color-ops-bg)]/90 border border-[var(--color-ops-line)] px-2 py-1 font-mono text-[10px] text-[var(--color-ops-secondary)]">
                    SATELLITE ·{" "}
                    {analysis.nasa_capture?.coverage_km} KM TILE ·{" "}
                    {analysis.nasa_capture?.resolution_m} M/PX
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  icon={AlertTriangle}
                  label="DETECTED DISASTER"
                  value={analysis.result?.disaster_type || "Not classified"}
                />
                <ResultCard
                  icon={Boxes}
                  label="AFFECTED STRUCTURES"
                  value={`${analysis.result?.affected_structures ?? 0}`}
                />
              </div>

              {/* Severity gauge */}
              <div className="panel-raised p-4">
                <div className="flex items-center justify-between">
                  <span className="eyebrow flex items-center gap-2">
                    <Gauge size={13} />
                    DAMAGE SEVERITY
                  </span>
                  <span className={`data-value text-3xl ${severityTone}`}>{severity}%</span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-sm bg-[var(--color-ops-bg)]">
                  <div
                    className={`h-full rounded-sm transition-all duration-700 ${
                      severity >= 80
                        ? "bg-[var(--color-ops-crit)]"
                        : severity >= 50
                          ? "bg-[var(--color-ops-warn)]"
                          : "bg-[var(--color-ops-safe)]"
                    }`}
                    style={{ width: `${severity}%` }}
                  />
                </div>

                <p className="mt-2 font-mono text-[10px] text-[var(--color-ops-muted)]">
                  CONFIDENCE {analysis.result?.confidence ?? 0}% · PROVIDER:{" "}
                  {String(analysis.provider || "unknown").toUpperCase()}
                </p>
              </div>

              {analysis.result?.structural_damage && (
                <div className="panel-raised p-4">
                  <p className="eyebrow mb-2">STRUCTURAL DAMAGE ASSESSMENT</p>
                  <p className="text-xs leading-relaxed text-[var(--color-ops-secondary)]">
                    {analysis.result.structural_damage}
                  </p>
                </div>
              )}

              {analysis.result?.bounding_metadata?.length > 0 && (
                <div className="panel-raised p-4">
                  <p className="eyebrow mb-3">AFFECTED GRID BOUNDING METADATA</p>
                  <div className="space-y-2">
                    {analysis.result.bounding_metadata.map((box, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-[var(--color-ops-text)]">
                          {box.label}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-ops-muted)]">
                          x:{box.x.toFixed(2)} y:{box.y.toFixed(2)} w:
                          {box.width.toFixed(2)} h:{box.height.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-4 py-3">
                <span className="eyebrow flex items-center gap-2">
                  <Database size={13} />
                  SUPABASE STORAGE
                </span>
                {analysis.storage_status?.startsWith("stored") ? (
                  <span className="badge badge-safe">
                    {analysis.storage_path?.startsWith("local:")
                      ? "STORED · LOCAL ARCHIVE"
                      : "STORED · REMOTE"}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-[var(--color-ops-warn)]">
                    {analysis.storage_status || "UNCONFIGURED"}
                  </span>
                )}
              </div>
              {analysis.storage_path && (
                <p className="break-all font-mono text-[10px] text-[var(--color-ops-muted)]">
                  {analysis.storage_path}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ================================================================
   UPLOAD PANEL — existing Gemini Vision upload pipeline
   ================================================================ */

function UploadPanel() {
  const fileInputRef = useRef(null);

  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");

  const [result, setResult] = useState(null);
  const [provider, setProvider] = useState("");
  const [storageStatus, setStorageStatus] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyzeFile = async (uploadedFile) => {
    if (!uploadedFile) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", uploadedFile);
    if (location.trim()) formData.append("location", location.trim());
    if (category) formData.append("disaster_category", category);

    try {
      const data = await apiUpload("/api/imagery/analyze", formData);
      setResult(data.result || null);
      setProvider(data.provider || "unavailable");
      setStorageStatus(data.storage_status || "stored");
      setStoragePath(data.storage_path || "");
      setAnalyzed(true);
    } catch (analysisError) {
      setError(analysisError.message || "Image analysis failed.");
      setAnalyzed(false);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) acceptFile(uploadedFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    const uploadedFile = event.dataTransfer.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }

    acceptFile(uploadedFile);
  };

  const acceptFile = (uploadedFile) => {
    setImage(URL.createObjectURL(uploadedFile));
    setFile(uploadedFile);
    setAnalyzed(false);
    setResult(null);
    setProvider("");
    setStorageStatus("");
    setStoragePath("");
    setError("");
    analyzeFile(uploadedFile);
  };

  const severity = result?.severity_score ?? 0;
  const severityTone =
    severity >= 80
      ? "text-[var(--color-ops-crit)]"
      : severity >= 50
        ? "text-[var(--color-ops-warn)]"
        : "text-[var(--color-ops-safe)]";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Upload panel */}
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-ops-line)] px-4 py-3">
          <div>
            <h2 className="panel-title">DISASTER IMAGERY</h2>
            <p className="panel-sub mt-0.5">
              Upload satellite or drone captures for assessment
            </p>
          </div>

          <span className="badge badge-safe">
            <span className="live-dot live-dot--live" aria-hidden="true" />
            UPLOAD READY
          </span>
        </div>

        <div className="relative space-y-4 p-4">

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter") fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-8 py-12 transition-colors ${
              dragging
                ? "border-[var(--color-ops-accent)] bg-[var(--color-ops-overlay)]"
                : "border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] hover:border-[var(--color-ops-line-strong)]"
            }`}
          >
            <CloudUpload
              size={30}
              className={dragging ? "text-[var(--color-ops-text)]" : "text-[var(--color-ops-muted)]"}
            />

            <span className="mt-3 text-xs font-semibold text-[var(--color-ops-text)]">
              {dragging ? "Drop image to upload" : "Drag & drop imagery, or click to browse"}
            </span>

            <span className="mt-1 font-mono text-[10px] text-[var(--color-ops-muted)]">
              JPG · PNG · WEBP · MAX 10MB
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Context fields */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Location Reference</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kukatpally, Telangana"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Disaster Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field-input"
              >
                <option value="">Auto-classify</option>
                {DISASTER_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {image && (
            <div>
              <div className="relative overflow-hidden rounded-md border border-[var(--color-ops-line)]">
                <img
                  src={image}
                  alt="Uploaded disaster imagery"
                  className="max-h-72 w-full object-cover"
                />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImage(null);
                    setFile(null);
                    setAnalyzed(false);
                    setResult(null);
                  }}
                  className="absolute right-2 top-2 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)]/90 p-1.5 text-[var(--color-ops-secondary)] hover:text-[var(--color-ops-text)]"
                >
                  <X size={14} />
                </button>

                <span className="absolute bottom-2 left-2 rounded-sm border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)]/90 px-2 py-1 font-mono text-[10px] text-[var(--color-ops-secondary)]">
                  {file?.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => analyzeFile(file)}
                disabled={loading}
                className="btn btn-primary mt-3 w-full"
              >
                {loading ? <RefreshCw size={14} className="spinner" /> : <Brain size={14} />}
                {loading ? "ANALYZING…" : "RE-RUN ANALYSIS"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Results panel */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-ops-line)] px-4 py-3">
          <div>
            <h2 className="panel-title">AI DAMAGE ASSESSMENT</h2>
            <p className="panel-sub mt-0.5">Computer vision assessment results</p>
          </div>

          {analyzed && (
            <span className="badge badge-safe">
              <CheckCircle size={11} />
              {provider === "gemini" ? "ANALYSIS COMPLETE" : "FALLBACK MODE"}
            </span>
          )}
        </div>

        <div className="p-4">
          {!analyzed && !loading && (
            <div className="flex min-h-96 flex-col items-center justify-center text-center">
              <Building2 size={36} className="text-[var(--color-ops-line-strong)]" />
              <p className="mt-4 text-xs font-semibold text-[var(--color-ops-secondary)]">
                No analysis available
              </p>
              <p className="mt-1 font-mono text-[10px] text-[var(--color-ops-muted)]">
                Upload imagery to run the assessment
              </p>
            </div>
          )}

          {loading && (
            <div className="flex min-h-96 flex-col items-center justify-center text-center">
              <span className="h-8 w-8 spinner rounded-full border-2 border-[var(--color-ops-line-strong)] border-t-[var(--color-ops-accent)]" />
              <p className="mt-4 text-xs text-[var(--color-ops-secondary)]">
                Sending imagery to the vision model…
              </p>
              <p className="mt-1 font-mono text-[10px] text-[var(--color-ops-muted)]">
                Classifying damage · estimating severity
              </p>
            </div>
          )}

          {analyzed && result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  icon={AlertTriangle}
                  label="DETECTED DISASTER"
                  value={result.disaster_type || "Not classified"}
                />
                <ResultCard
                  icon={Boxes}
                  label="AFFECTED STRUCTURES"
                  value={`${result.affected_structures ?? 0}`}
                />
              </div>

              {/* Severity gauge */}
              <div className="panel-raised p-4">
                <div className="flex items-center justify-between">
                  <span className="eyebrow flex items-center gap-2">
                    <Gauge size={13} />
                    DAMAGE SEVERITY
                  </span>

                  <span className={`data-value text-3xl ${severityTone}`}>{severity}%</span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-sm bg-[var(--color-ops-bg)]">
                  <div
                    className={`h-full rounded-sm transition-all duration-700 ${
                      severity >= 80
                        ? "bg-[var(--color-ops-crit)]"
                        : severity >= 50
                          ? "bg-[var(--color-ops-warn)]"
                          : "bg-[var(--color-ops-safe)]"
                    }`}
                    style={{ width: `${severity}%` }}
                  />
                </div>

                <p className="mt-2 font-mono text-[10px] text-[var(--color-ops-muted)]">
                  CONFIDENCE {result.confidence ?? 0}% · PROVIDER: {provider.toUpperCase()}
                </p>
              </div>

              {result.structural_damage && (
                <div className="panel-raised p-4">
                  <p className="eyebrow mb-2">STRUCTURAL DAMAGE ASSESSMENT</p>
                  <p className="text-xs leading-relaxed text-[var(--color-ops-secondary)]">
                    {result.structural_damage}
                  </p>
                </div>
              )}

              {result.bounding_metadata?.length > 0 && (
                <div className="panel-raised p-4">
                  <p className="eyebrow mb-3">AFFECTED GRID BOUNDING METADATA</p>

                  <div className="space-y-2">
                    {result.bounding_metadata.map((box, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-[var(--color-ops-text)]">
                          {box.label}
                        </span>

                        <span className="font-mono text-[10px] text-[var(--color-ops-muted)]">
                          x:{box.x.toFixed(2)} y:{box.y.toFixed(2)} w:
                          {box.width.toFixed(2)} h:{box.height.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage status */}
              <div className="flex items-center justify-between rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-4 py-3">
                <span className="eyebrow flex items-center gap-2">
                  <Database size={13} />
                  STORAGE
                </span>

                {storageStatus?.startsWith("stored") ? (
                  <span className="badge badge-safe">
                    {storagePath?.startsWith("local:")
                      ? "STORED · LOCAL ARCHIVE"
                      : "STORED · REMOTE"}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-[var(--color-ops-warn)]">
                    {storageStatus || "UNCONFIGURED"}
                  </span>
                )}
              </div>

              {storagePath && (
                <p className="break-all font-mono text-[10px] text-[var(--color-ops-muted)]">
                  {storagePath}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border border-[color-mix(in_srgb,var(--color-ops-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-crit)_10%,transparent)] p-3 text-xs text-[var(--color-ops-crit-text)]">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ResultCard({ icon: Icon, label, value }) {
  return (
    <div className="panel-raised p-3.5">
      <div className="flex items-center gap-2 text-[var(--color-ops-muted)]">
        <Icon size={13} />
        <span className="eyebrow">{label}</span>
      </div>

      <p className="mt-2 text-sm font-bold text-[var(--color-ops-text)]">{value}</p>
    </div>
  );
}

export default Imagery;
