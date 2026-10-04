import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
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
  ChevronDown,
  Radio,
  Send,
} from "lucide-react";
import { apiGet, apiPost } from "../services/api";

const URGENCY_SCALE = [
  { level: 5, label: "Critical" },
  { level: 4, label: "High" },
  { level: 3, label: "Moderate" },
  { level: 2, label: "Guarded" },
  { level: 1, label: "Low" },
];

const DISASTER_TAGS = [
  "Flood",
  "Earthquake",
  "Cyclone",
  "Wildfire",
  "Landslide",
  "Structural Damage",
  "General Emergency",
];

const REGIONS = [
  "Telangana",
  "Andhra Pradesh",
  "Tamil Nadu",
  "Karnataka",
  "Kerala",
];

const inputClass =
  "rounded-md border border-[#1e293b] bg-[#0b1424] px-3 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-500";

function selectClass() {
  return (
    "h-9 appearance-none rounded-md border border-[#1e293b] bg-[#0b1424] pl-3 pr-8 text-xs font-medium text-slate-300 outline-none focus:border-slate-500"
  );
}

function CrisisIntelligence() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [disasterFilter, setDisasterFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");

  const [text, setText] = useState(
    "Kukatpally lo flood water ekkuva undi, 20 people trapped rooftop vundaru, medical help urgently required"
  );
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await apiGet("/api/crisis/");
        if (!active) {
          return;
        }
        setMessages(data.messages || []);
      } catch (fetchError) {
        console.error(fetchError);
        if (active) {
          setError("Unable to load crisis feed from the backend.");
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

  const filtered = useMemo(() => {
    return messages.filter((message) => {
      const a = message.analysis;

      if (urgencyFilter !== "All" && a?.urgency_level !== Number(urgencyFilter)) {
        return false;
      }

      if (disasterFilter !== "All" && a?.disaster_tag !== disasterFilter) {
        return false;
      }

      if (regionFilter !== "All" && (a?.state || message.state) !== regionFilter) {
        return false;
      }

      return true;
    });
  }, [messages, urgencyFilter, disasterFilter, regionFilter]);

  const disasterTags = useMemo(() => {
    const tags = new Set();
    messages.forEach((message) => {
      if (message.analysis?.disaster_tag) {
        tags.add(message.analysis.disaster_tag);
      }
    });
    return [...tags].sort();
  }, [messages]);

  const regions = useMemo(() => {
    const list = new Set();
    messages.forEach((message) => {
      const region = message.analysis?.state || message.state;
      if (region) {
        list.add(region);
      }
    });
    return [...list].sort();
  }, [messages]);

  const handleAnalyze = async () => {
    if (!text.trim() || analyzing) {
      return;
    }

    setAnalyzing(true);
    setAnalyzeError("");

    try {
      const data = await apiPost("/api/crisis/analyze", { text });
      setAnalysis(data.analysis);
    } catch (analyzeFailure) {
      setAnalyzeError(analyzeFailure.message || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

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
                <Brain size={20} />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-slate-100 tracking-wide">
                  CRISIS INTELLIGENCE
                </h1>

                <p className="text-xs text-slate-500 mt-0.5">
                  NLP extraction from noisy, code-mixed field reports
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {loading ? "SYNCING" : `${messages.length} MESSAGES`}
            </div>
          </div>

          {/* Pipeline */}
          <div className="mb-6 grid grid-cols-4 gap-4">
            <PipelineCard
              icon={MessageSquareText}
              title="RAW REPORT"
              text="SMS / SOCIAL"
            />
            <PipelineCard
              icon={Brain}
              title="NLP EXTRACTION"
              text="ENTITIES + URGENCY"
            />
            <PipelineCard
              icon={Activity}
              title="PRIORITY ENGINE"
              text="LEVEL 1-5 SCORING"
            />
            <PipelineCard
              icon={Truck}
              title="RESPONSE"
              text="AID RECOMMENDATION"
            />
          </div>

          {/* Filter bar */}
          <div className="rounded-md border border-[#1e293b] bg-[#0f172a] p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <FilterLabel>URGENCY LEVEL</FilterLabel>
              <FilterSelect
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                options={[
                  { value: "All", label: "All levels (1-5)" },
                  ...URGENCY_SCALE.map((item) => ({
                    value: String(item.level),
                    label: `L${item.level} · ${item.label}`,
                  })),
                ]}
              />

              <FilterLabel>DISASTER TAG</FilterLabel>
              <FilterSelect
                value={disasterFilter}
                onChange={(e) => setDisasterFilter(e.target.value)}
                options={[
                  { value: "All", label: "All tags" },
                  ...(disasterTags.length ? disasterTags : DISASTER_TAGS).map(
                    (tag) => ({ value: tag, label: tag })
                  ),
                ]}
              />

              <FilterLabel>REGION</FilterLabel>
              <FilterSelect
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                options={[
                  { value: "All", label: "All regions" },
                  ...(regions.length ? regions : REGIONS).map((region) => ({
                    value: region,
                    label: region,
                  })),
                ]}
              />

              <p className="ml-auto text-[10px] font-mono text-slate-600">
                {filtered.length} / {messages.length} RECORDS
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 mb-4 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Message feed */}
            <section className="rounded-md border border-[#1e293b] bg-[#0f172a] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e293b]">
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  INTERCEPTED CRISIS FEED
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Code-mixed reports from SMS and social channels
                </p>
              </div>

              <div className="p-3 space-y-2 max-h-[640px] overflow-auto">
                {loading && (
                  <div className="py-14 text-center">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-500" />
                    <p className="mt-2 text-xs text-slate-500">
                      Loading crisis feed...
                    </p>
                  </div>
                )}

                {!loading && filtered.length === 0 && (
                  <div className="py-14 text-center">
                    <Radio size={28} className="mx-auto text-slate-700" />
                    <p className="mt-3 text-xs text-slate-500">
                      No messages match the active filters.
                    </p>
                  </div>
                )}

                {!loading &&
                  filtered.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
              </div>
            </section>

            {/* Analyzer */}
            <section className="rounded-md border border-[#1e293b] bg-[#0f172a] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1e293b]">
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  LIVE REPORT ANALYZER
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Submit any field report for entity extraction
                </p>
              </div>

              <div className="p-4 space-y-4 flex-1">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="Enter a disaster report in any language mix..."
                  className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
                />

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !text.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-white disabled:opacity-50"
                >
                  <Send size={13} />
                  {analyzing ? "ANALYZING..." : "RUN NLP EXTRACTION"}
                </button>

                {analyzeError && (
                  <p className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                    {analyzeError}
                  </p>
                )}

                {analysis && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <ExtractionCard
                        icon={MapPin}
                        label="LOCATION"
                        value={analysis.location || "Unknown"}
                        sub={analysis.state || "Region unknown"}
                      />
                      <ExtractionCard
                        icon={AlertTriangle}
                        label="DISASTER TAG"
                        value={analysis.disaster_tag}
                        sub={analysis.code_mixed ? "CODE-MIXED INPUT" : "ENGLISH INPUT"}
                      />
                      <ExtractionCard
                        icon={Users}
                        label="PEOPLE AFFECTED"
                        value={
                          analysis.people_affected != null
                            ? String(analysis.people_affected)
                            : "NOT SPECIFIED"
                        }
                        sub="EXTRACTED FROM TEXT"
                      />
                      <ExtractionCard
                        icon={Activity}
                        label="URGENCY"
                        value={`L${analysis.urgency_level} · ${analysis.urgency}`}
                        sub="SCALE 1-5"
                        tone={analysis.urgency_level >= 4 ? "rose" : analysis.urgency_level === 3 ? "amber" : "default"}
                      />
                    </div>

                    <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-4">
                      <p className="text-[10px] font-bold tracking-wider text-slate-500 mb-3">
                        REQUIRED RESCUE AID
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {analysis.required_aid.map((item) => (
                          <AidBadge key={item} item={item} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!analysis && !analyzing && (
                  <div className="rounded-md border border-dashed border-[#1e293b] p-8 text-center">
                    <Brain size={26} className="mx-auto text-slate-700" />
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                      Extraction results will appear here: location, disaster
                      tag, urgency level (1-5), affected population and
                      required aid.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* XAI note */}
          <section className="mt-4 rounded-md border border-[#1e293b] bg-[#0f172a] p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-[#0b1424] border border-[#1e293b] p-3 text-slate-300">
                <Brain size={20} />
              </div>

              <div>
                <h2 className="text-xs font-bold tracking-wider text-slate-200">
                  EXTRACTION ENGINE NOTES
                </h2>

                <p className="mt-2 text-xs leading-6 text-slate-400">
                  The NLP service parses noisy, code-mixed social media and
                  SMS text (Telugu, Tamil, Malayalam, Hinglish and English)
                  to extract location aliases across South India, disaster
                  tags, urgency levels 1-5, affected population counts and
                  required rescue aid. Extracted entities feed directly into
                  the multimodal fusion engine as the 35% NLP urgency
                  signal.
                </p>
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

function FilterLabel({ children }) {
  return (
    <span className="text-[10px] font-bold tracking-wider text-slate-500">
      {children}
    </span>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass()}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600"
      />
    </div>
  );
}

function MessageCard({ message }) {
  const a = message.analysis || {};
  const level = a.urgency_level || 1;

  const levelStyles = {
    5: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    4: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    3: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    2: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    1: "text-slate-300 bg-slate-500/10 border-slate-500/30",
  };

  return (
    <article className="rounded-md border border-[#1e293b] bg-[#0b1424] p-3.5 hover:bg-[#131f38] transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-slate-600">
            {message.id}
          </span>

          <span className="text-[10px] font-mono uppercase text-slate-500 truncate">
            {message.location} · {message.state}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-sm border font-mono text-[10px] font-bold ${levelStyles[level]}`}
          >
            L{level} {a.urgency || "LOW"}
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-slate-300 font-mono">
        {message.text}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1">
          <AlertTriangle size={11} className="text-slate-600" />
          {a.disaster_tag || "GENERAL"}
        </span>

        <span className="flex items-center gap-1">
          <Users size={11} className="text-slate-600" />
          {a.people_affected != null ? `${a.people_affected} PPL` : "NO COUNT"}
        </span>

        <span className="flex items-center gap-1">
          <HeartPulse size={11} className="text-slate-600" />
          {(a.required_aid || []).join(" + ").toUpperCase()}
        </span>

        <span className="ml-auto">{message.source} · {message.time}</span>
      </div>
    </article>
  );
}

function ExtractionCard({ icon: Icon, label, value, sub, tone }) {
  const valueColor =
    tone === "rose"
      ? "text-rose-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-slate-100";

  return (
    <div className="rounded-md border border-[#1e293b] bg-[#0b1424] p-3.5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={13} />
        <span className="text-[10px] font-bold tracking-wider">{label}</span>
      </div>

      <p className={`mt-2 text-sm font-bold ${valueColor}`}>{value}</p>

      {sub && (
        <p className="mt-1 text-[10px] font-mono text-slate-600">{sub}</p>
      )}
    </div>
  );
}

function AidBadge({ item }) {
  let icon = <Truck size={13} />;

  if (item === "Medical") {
    icon = <HeartPulse size={13} />;
  }

  if (item === "Water") {
    icon = <Droplets size={13} />;
  }

  if (item === "Food") {
    icon = <Utensils size={13} />;
  }

  return (
    <span className="flex items-center gap-1.5 rounded border border-[#1e293b] bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-slate-300">
      {icon}
      {item}
    </span>
  );
}

export default CrisisIntelligence;
