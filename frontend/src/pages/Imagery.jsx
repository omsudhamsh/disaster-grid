import { useRef, useState } from "react";
import { useAuth, SignInButton } from "@clerk/react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  Image as ImageIcon,
  Upload,
  Brain,
  Building2,
  AlertTriangle,
  CheckCircle,
  Activity,
  Lock,
  X,
  CloudUpload,
  Boxes,
  Gauge,
  Database,
} from "lucide-react";
import { apiUpload } from "../services/api";

const DISASTER_CATEGORIES = [
  "Flood",
  "Earthquake",
  "Cyclone",
  "Wildfire",
  "Structural Damage",
];

const inputClass =
  "h-10 w-full rounded-md border border-[#1e293b] bg-[#0b1424] px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-500";

function Imagery() {
  const { isSignedIn } = useAuth();
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
    if (!uploadedFile) {
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", uploadedFile);
    if (location.trim()) {
      formData.append("location", location.trim());
    }
    if (category) {
      formData.append("disaster_category", category);
    }

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
    if (!uploadedFile) {
      return;
    }

    acceptFile(uploadedFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    const uploadedFile = event.dataTransfer.files?.[0];
    if (!uploadedFile) {
      return;
    }

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
      ? "text-rose-400"
      : severity >= 50
        ? "text-amber-400"
        : "text-emerald-400";

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          {/* Heading */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-[#0b1424] border border-[#1e293b] p-3 text-slate-200">
                <ImageIcon size={20} />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-slate-100 tracking-wide">
                  IMAGERY ANALYSIS
                </h1>

                <p className="text-xs text-slate-500 mt-0.5">
                  Gemini Vision damage assessment from satellite and drone
                  imagery
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              SUPABASE + GEMINI
            </div>
          </div>

          {/* Pipeline */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <PipelineCard icon={Upload} title="IMAGE INPUT" text="SATELLITE / DRONE" />
            <PipelineCard icon={Brain} title="VISION ANALYSIS" text="GEMINI FLASH" />
            <PipelineCard icon={Activity} title="ASSESSMENT" text="SEVERITY 0-100%" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Upload panel */}
            <section className="rounded-md border border-[#1e293b] bg-[#0f172a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold tracking-wider text-slate-200">
                    DISASTER IMAGERY
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload satellite or drone captures for assessment
                  </p>
                </div>

                {!isSignedIn && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                    <Lock size={11} />
                    AUTH REQUIRED
                  </span>
                )}
              </div>

              <div className="p-4 space-y-4 relative">
                {/* Auth gate overlay */}
                {!isSignedIn && (
                  <div className="absolute inset-0 z-10 bg-[#0f172a]/90 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-b-md">
                    <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-3 text-slate-400">
                      <Lock size={22} />
                    </div>

                    <p className="text-xs text-slate-400 text-center max-w-[260px] leading-relaxed">
                      Sign in to upload satellite imagery and run Gemini
                      Vision analysis.
                    </p>

                    <SignInButton mode="modal">
                      <button className="rounded-md bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-white">
                        SIGN IN TO UPLOAD
                      </button>
                    </SignInButton>
                  </div>
                )}

                {/* Drop zone */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-8 py-12 transition-colors ${
                    dragging
                      ? "border-slate-400 bg-[#131f38]"
                      : "border-[#1e293b] bg-[#0b1424] hover:border-slate-600"
                  }`}
                >
                  <CloudUpload
                    size={30}
                    className={dragging ? "text-slate-300" : "text-slate-500"}
                  />

                  <span className="mt-3 text-xs font-semibold text-slate-300">
                    {dragging ? "Drop image to upload" : "Drag & drop imagery, or click to browse"}
                  </span>

                  <span className="mt-1 text-[10px] font-mono text-slate-600">
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
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Location Reference
                    </span>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Kukatpally, Telangana"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Disaster Category
                    </span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={inputClass}
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
                    <div className="relative rounded-md border border-[#1e293b] overflow-hidden">
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
                        className="absolute top-2 right-2 rounded-md bg-[#0f172a]/90 border border-[#1e293b] p-1.5 text-slate-300 hover:text-slate-100"
                      >
                        <X size={14} />
                      </button>

                      <span className="absolute bottom-2 left-2 rounded-sm bg-[#0f172a]/90 border border-[#1e293b] px-2 py-1 font-mono text-[10px] text-slate-300">
                        {file?.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => analyzeFile(file)}
                      disabled={loading}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-white disabled:opacity-50"
                    >
                      <Brain size={14} />
                      {loading ? "ANALYZING WITH GEMINI..." : "RE-RUN ANALYSIS"}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Results panel */}
            <section className="rounded-md border border-[#1e293b] bg-[#0f172a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold tracking-wider text-slate-200">
                    AI DAMAGE ASSESSMENT
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Computer vision assessment results
                  </p>
                </div>

                {analyzed && (
                  <span className="flex items-center gap-1.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle size={11} />
                    {provider === "gemini" ? "ANALYSIS COMPLETE" : "FALLBACK MODE"}
                  </span>
                )}
              </div>

              <div className="p-4">
                {!analyzed && !loading && (
                  <div className="flex min-h-96 flex-col items-center justify-center text-center">
                    <Building2 size={36} className="text-slate-700" />
                    <p className="mt-4 text-xs font-semibold text-slate-400">
                      No analysis available
                    </p>
                    <p className="mt-1 text-[10px] font-mono text-slate-600">
                      Upload imagery to run the assessment
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="flex min-h-96 flex-col items-center justify-center text-center">
                    <span className="h-8 w-8 animate-spin rounded-full border-3 border-slate-700 border-t-emerald-500" />
                    <p className="mt-4 text-xs text-slate-400">
                      Sending imagery to Gemini Vision...
                    </p>
                    <p className="mt-1 text-[10px] font-mono text-slate-600">
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
                    <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-slate-500">
                          <Gauge size={13} />
                          DAMAGE SEVERITY
                        </span>

                        <span className={`font-mono text-3xl font-bold ${severityTone}`}>
                          {severity}%
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-sm bg-[#0f172a]">
                        <div
                          className={`h-full rounded-sm transition-all duration-700 ${
                            severity >= 80
                              ? "bg-rose-500"
                              : severity >= 50
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${severity}%` }}
                        />
                      </div>

                      <p className="mt-2 text-[10px] font-mono text-slate-600">
                        CONFIDENCE {result.confidence ?? 0}% · PROVIDER: {provider.toUpperCase()}
                      </p>
                    </div>

                    {result.structural_damage && (
                      <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-4">
                        <p className="text-[10px] font-bold tracking-wider text-slate-500 mb-2">
                          STRUCTURAL DAMAGE ASSESSMENT
                        </p>
                        <p className="text-xs leading-relaxed text-slate-300">
                          {result.structural_damage}
                        </p>
                      </div>
                    )}

                    {result.bounding_metadata?.length > 0 && (
                      <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-4">
                        <p className="text-[10px] font-bold tracking-wider text-slate-500 mb-3">
                          AFFECTED GRID BOUNDING METADATA
                        </p>

                        <div className="space-y-2">
                          {result.bounding_metadata.map((box, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded border border-[#1e293b] bg-[#0f172a] px-3 py-2"
                            >
                              <span className="text-xs font-semibold text-slate-200">
                                {box.label}
                              </span>

                              <span className="font-mono text-[10px] text-slate-500">
                                x:{box.x.toFixed(2)} y:{box.y.toFixed(2)} w:
                                {box.width.toFixed(2)} h:{box.height.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Storage status */}
                    <div className="flex items-center justify-between rounded-md border border-[#1e293b] bg-[#0b1424] px-4 py-3">
                      <span className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-slate-500">
                        <Database size={13} />
                        SUPABASE STORAGE
                      </span>

                      {storageStatus === "stored" ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                          <CheckCircle size={11} />
                          STORED · disaster-images
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400">
                          {storageStatus || "UNCONFIGURED"}
                        </span>
                      )}
                    </div>

                    {storagePath && (
                      <p className="font-mono text-[10px] text-slate-600 break-all">
                        {storagePath}
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <p className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                    {error}
                  </p>
                )}

                {analyzed && provider === "gemini" && storageStatus.startsWith("unavailable") && (
                  <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                    Gemini analysis completed, but Supabase storage is
                    unavailable. Create the configured disaster-images
                    bucket and retry.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* XAI summary */}
          <section className="mt-4 rounded-md border border-[#1e293b] bg-[#0f172a] p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-[#0b1424] border border-[#1e293b] p-3 text-slate-300">
                <Brain size={20} />
              </div>

              <div>
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  EXPLAINABLE ASSESSMENT
                </h2>

                <p className="mt-2 text-xs leading-6 text-slate-400">
                  Gemini Vision classifies the disaster type, estimates
                  affected structures and produces a 0-100 damage severity
                  score with normalized bounding-box metadata for each
                  damaged region. Results persist to the Supabase
                  <span className="font-mono text-slate-300"> disaster-images </span>
                  bucket and
                  <span className="font-mono text-slate-300"> imagery_analysis </span>
                  table, then feed the fusion engine as the 40% vision
                  damage signal for the affected grid cell.
                </p>

                {analyzed && result && (
                  <p className="mt-3 rounded-md border border-[#1e293b] bg-[#0b1424] p-3 font-mono text-[11px] leading-relaxed text-slate-300">
                    XAI TRACE · {result.disaster_type} detected at{" "}
                    {result.location || "unlocated grid"} with {severity}%
                    damage severity across{" "}
                    {result.affected_structures ?? 0} structures at{" "}
                    {result.confidence ?? 0}% confidence.
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function PipelineCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-md border border-[#1e293b] bg-[#0f172a] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded border border-[#1e293b] bg-[#0b1424] p-2 text-slate-300">
          <Icon size={16} />
        </div>

        <div>
          <div className="text-xs font-bold text-slate-200">{title}</div>
          <div className="text-[10px] font-mono text-slate-600 mt-0.5">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-3.5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={13} />
        <span className="text-[10px] font-bold tracking-wider">{label}</span>
      </div>

      <p className="mt-2 text-sm font-bold text-slate-100">{value}</p>
    </div>
  );
}

export default Imagery;
