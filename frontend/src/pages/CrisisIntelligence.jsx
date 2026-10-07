import { useCallback, useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
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
  RefreshCw,
  Loader2,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  "rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 py-2.5 text-sm text-[var(--color-ops-text)] outline-none placeholder:text-[var(--color-ops-muted)] focus:border-[var(--color-ops-line-strong)]";

function selectClass() {
  return (
    "h-9 appearance-none rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] pl-3 pr-8 text-xs font-medium text-[var(--color-ops-secondary)] outline-none focus:border-[var(--color-ops-line-strong)]"
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

  // Shared loader. It performs no synchronous setState so it is safe to
  // call from an effect; the manual-refresh spinner lives in `refresh`
  // and is owned by the click handler.
  const load = useCallback(async () => {
    try {
      const data = await apiGet("/api/crisis/");
      setMessages(data.messages || []);
      setError("");
    } catch (fetchError) {
      console.error(fetchError);
      setError("Unable to load crisis feed from the backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  useEffect(() => {
    // Async data fetch: every setState below happens after the network
    // round-trip resolves, never synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

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
    <PageShell >
          {/* Heading */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">Social &amp; broadcast</p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-ops-text)]">
                Crisis Intelligence
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-ops-muted)]">
                NLP extraction from noisy, code-mixed field reports
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="safe">
                <span className="live-dot live-dot--live" aria-hidden="true" />
                {loading ? "SYNCING" : `${messages.length} MESSAGES`}
              </Badge>

              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={refresh}
                disabled={refreshing}
                aria-busy={refreshing}
              >
                <RefreshCw size={12} aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Pipeline */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <PipelineCard
              icon={MessageSquareText}
              title="RAW REPORT"
              text="SOCIAL / COMMUNITY"
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
          <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-4 mb-4">
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

              <p className="ml-auto text-[10px] font-mono text-[var(--color-ops-muted)]">
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
            <section className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-ops-line)]">
                <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                  INTERCEPTED CRISIS FEED
                </h2>
                <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
                  Code-mixed reports from social and community channels
                </p>
              </div>

              <div className="p-3 space-y-2 max-h-[640px] overflow-auto">
                {loading && (
                  <div className="py-14 text-center">
                    <span className="inline-block h-4 w-4 spinner rounded-full border-2 border-[var(--color-ops-line)] border-t-[var(--color-ops-safe)]" />
                    <p className="mt-2 text-xs text-[var(--color-ops-muted)]">
                      Loading crisis feed...
                    </p>
                  </div>
                )}

                {!loading && filtered.length === 0 && (
                  <div className="py-14 text-center">
                    <Radio size={28} className="mx-auto text-[var(--color-ops-muted)]" />
                    <p className="mt-3 text-xs text-[var(--color-ops-muted)]">
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
            <section className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-ops-line)]">
                <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                  LIVE REPORT ANALYZER
                </h2>
                <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
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

                <Button
                  type="button"
                  variant="default"
                  block
                  onClick={handleAnalyze}
                  disabled={analyzing || !text.trim()}
                  aria-busy={analyzing}
                >
                  {analyzing ? (
                    <Loader2 size={14} className="spinner" aria-hidden="true" />
                  ) : (
                    <Send size={13} aria-hidden="true" />
                  )}
                  {analyzing ? "Analyzing…" : "Run NLP extraction"}
                </Button>

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

                    <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] p-4">
                      <p className="text-[10px] font-bold tracking-wider text-[var(--color-ops-muted)] mb-3">
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
                  <div className="rounded-md border border-dashed border-[var(--color-ops-line)] p-8 text-center">
                    <Brain size={26} className="mx-auto text-[var(--color-ops-muted)]" />
                    <p className="mt-3 text-xs text-[var(--color-ops-muted)] leading-relaxed">
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
          <section className="mt-4 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-md bg-[var(--color-ops-raised)] border border-[var(--color-ops-line)] p-3 text-[var(--color-ops-secondary)]">
                <Brain size={20} />
              </div>

              <div>
                <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                  EXTRACTION ENGINE NOTES
                </h2>

                <p className="mt-2 text-xs leading-6 text-[var(--color-ops-secondary)]">
                  The NLP service parses noisy, code-mixed social media and
                  community text (Telugu, Tamil, Malayalam, Hinglish and English)
                  to extract location aliases across South India, disaster
                  tags, urgency levels 1-5, affected population counts and
                  required rescue aid. Extracted entities feed directly into
                  the multimodal fusion engine as the 35% NLP urgency
                  signal.
                </p>
              </div>
            </div>
          </section>
    </PageShell>
  );
}

function PipelineCard({ icon: Icon, title, text }) {
  return (
    <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-4">
      <div className="flex items-center gap-3">
        <div className="rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] p-2 text-[var(--color-ops-secondary)]">
          <Icon size={16} />
        </div>

        <div>
          <div className="text-xs font-bold text-[var(--color-ops-text)]">{title}</div>
          <div className="text-[10px] font-mono text-[var(--color-ops-muted)] mt-0.5">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterLabel({ children }) {
  return (
    <span className="text-[10px] font-bold tracking-wider text-[var(--color-ops-muted)]">
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
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ops-muted)]"
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
    1: "text-[var(--color-ops-secondary)] bg-[color-mix(in_srgb,var(--color-ops-secondary)_10%,transparent)] border-[color-mix(in_srgb,var(--color-ops-secondary)_30%,transparent)]",
  };

  return (
    <article className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] p-3.5 hover:bg-[var(--color-ops-overlay)] transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-[var(--color-ops-muted)]">
            {message.id}
          </span>

          <span className="text-[10px] font-mono uppercase text-[var(--color-ops-muted)] truncate">
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

      <p className="mt-2.5 text-xs leading-relaxed text-[var(--color-ops-secondary)] font-mono">
        {message.text}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-[var(--color-ops-muted)]">
        <span className="flex items-center gap-1">
          <AlertTriangle size={11} className="text-[var(--color-ops-muted)]" />
          {a.disaster_tag || "GENERAL"}
        </span>

        <span className="flex items-center gap-1">
          <Users size={11} className="text-[var(--color-ops-muted)]" />
          {a.people_affected != null ? `${a.people_affected} PPL` : "NO COUNT"}
        </span>

        <span className="flex items-center gap-1">
          <HeartPulse size={11} className="text-[var(--color-ops-muted)]" />
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
        : "text-[var(--color-ops-text)]";

  return (
    <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] p-3.5">
      <div className="flex items-center gap-2 text-[var(--color-ops-muted)]">
        <Icon size={13} />
        <span className="text-[10px] font-bold tracking-wider">{label}</span>
      </div>

      <p className={`mt-2 text-sm font-bold ${valueColor}`}>{value}</p>

      {sub && (
        <p className="mt-1 text-[10px] font-mono text-[var(--color-ops-muted)]">{sub}</p>
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
    <span className="flex items-center gap-1.5 rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] px-3 py-1.5 text-xs font-medium text-[var(--color-ops-secondary)]">
      {icon}
      {item}
    </span>
  );
}

export default CrisisIntelligence;
