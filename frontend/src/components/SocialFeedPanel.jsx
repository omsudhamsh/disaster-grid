import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  ExternalLink,
  MapPin,
  Newspaper,
  MessageCircle,
  Radio,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { apiGet } from "../services/api";
import { timeAgo } from "../services/geolocation";

const PLATFORM_META = {
  news: { icon: Newspaper, label: "News", chip: "badge-info" },
  reddit: { icon: MessageCircle, label: "Community", chip: "badge-muted" },
  gdacs: { icon: ShieldAlert, label: "Official Alert", chip: "badge-crit" },
};

const URGENCY_CHIP = {
  5: "badge-crit",
  4: "badge-warn",
  3: "badge-info",
  2: "badge-muted",
  1: "badge-muted",
};

/**
 * Live social intelligence panel — bot-screened, India-only posts from
 * news desks, eNewspapers, community reports and official alert services.
 * Every card links to its real source. The panel auto-refreshes at most
 * once every 15 minutes and the reload button forces a fresh fetch.
 */
export default function SocialFeedPanel({
  limit = 8,
  refreshMs = 900000,
  maxHeading = 60,
}) {
  const [posts, setPosts] = useState([]);
  const [sources, setSources] = useState({});
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const load = useCallback((force = false) => {
    return apiGet(`/api/social/feed${force ? "?refresh=true" : ""}`)
      .then((data) => {
        if (!mountedRef.current) return;
        setPosts(data.posts || []);
        setSources(data.sources || {});
        setUpdatedAt(data.updated_at || "");
        setError("");
      })
      .catch((fetchError) => {
        if (!mountedRef.current) return;
        setError(fetchError.message || "Feed unavailable");
      })
      .finally(() => {
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();

    // Auto-refresh at most once every 15 minutes (cache-friendly).
    const timer = setInterval(() => load(false), refreshMs);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [load, refreshMs]);

  const reload = () => {
    setRefreshing(true);
    load(true);
  };

  const liveCount = Object.values(sources).filter((status) => status === "live").length;
  const liveChannels = Object.entries(sources)
    .filter(([, status]) => status === "live")
    .map(([channel]) => channel.replace("_official", "").replace(/_/g, " ").toUpperCase());

  const visible = posts.slice(0, limit);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-ops-line)] px-4 py-3">
        <div>
          <h2 className="panel-title">SOCIAL INTELLIGENCE FEED</h2>
          <p className="panel-sub mt-0.5">
            Bot-screened · India-only · {liveCount}/3 channels live
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="live-dot live-dot--live" aria-hidden="true" />
          <button
            type="button"
            onClick={reload}
            disabled={loading || refreshing}
            aria-label="Refresh social intelligence feed"
            title="Refresh now"
            className="flex size-7 items-center justify-center rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] text-[var(--color-ops-secondary)] transition-colors hover:border-[var(--color-ops-line-strong)] hover:text-[var(--color-ops-text)] disabled:opacity-50"
          >
            <RefreshCw
              size={12}
              className={loading || refreshing ? "spinner" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {error && !visible.length && (
          <p className="rounded-md border border-[color-mix(in_srgb,var(--color-ops-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-crit)_10%,transparent)] p-3 text-xs text-[var(--color-ops-crit-text)]">
            {error}
          </p>
        )}

        {loading && !visible.length && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[74px] animate-pulse rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)]"
              />
            ))}
          </div>
        )}

        {visible.map((post) => {
          const meta = PLATFORM_META[post.platform] || PLATFORM_META.news;
          const PlatformIcon = meta.icon;
          return (
            <a
              key={post.id}
              href={post.url || "#"}
              target="_blank"
              rel="noreferrer noopener"
              className="block rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 py-2.5 transition-colors hover:border-[var(--color-ops-line-strong)] hover:bg-[var(--color-ops-overlay)]"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)]">
                  <PlatformIcon size={12} className="text-[var(--color-ops-secondary)]" />
                </span>
                <span className="truncate text-[11px] font-semibold text-[var(--color-ops-text)]">
                  {post.author}
                </span>
                {post.author_verified ? (
                  <BadgeCheck
                    size={12}
                    className="shrink-0 text-[var(--color-ops-accent)]"
                    aria-label="Verified account"
                  />
                ) : (
                  <span className="shrink-0 font-mono text-[9px] text-[var(--color-ops-muted)]">
                    HUMAN
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1.5">
                  <span className={`badge ${meta.chip}`}>{meta.label}</span>
                  <span className="font-mono text-[10px] text-[var(--color-ops-muted)]">
                    {timeAgo(post.published_at)}
                  </span>
                </span>
              </div>

              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-ops-secondary)]">
                {(post.text || post.title || "").slice(0, maxHeading + 60)}
              </p>

              <div className="mt-2 flex items-center gap-1.5">
                <span className={`badge ${URGENCY_CHIP[post.urgency_level] || "badge-muted"}`}>
                  {post.disaster_tag}
                </span>
                {post.location && (
                  <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--color-ops-muted)]">
                    <MapPin size={10} />
                    {post.location}
                  </span>
                )}
                <ExternalLink size={10} className="ml-auto text-[var(--color-ops-muted)]" />
              </div>
            </a>
          );
        })}

        {!loading && !visible.length && !error && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Radio size={22} className="text-[var(--color-ops-muted)]" />
            <p className="text-xs text-[var(--color-ops-secondary)]">
              No India-related disaster posts in the current window.
            </p>
          </div>
        )}
      </div>

      {updatedAt && (
        <div className="border-t border-[var(--color-ops-line)] px-4 py-2">
          <p className="font-mono text-[10px] text-[var(--color-ops-muted)]">
            FEED SYNCED {new Date(updatedAt).toLocaleTimeString()} ·{" "}
            {liveChannels.length ? liveChannels.join(" / ") : "NO LIVE CHANNELS"} ·
            BOT SCREENING ACTIVE
          </p>
        </div>
      )}
    </div>
  );
}
