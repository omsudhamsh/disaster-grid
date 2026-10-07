import { useEffect, useState } from "react";
import { Bell, Inbox, MapPin, Menu, Radio, ShieldCheck, Siren } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { UserButton, useUser } from "@clerk/react";

import { apiGet } from "../services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ThemeToggle from "@/components/ThemeToggle";
import { navigation } from "./nav-items";

const VERDICT_META = {
  danger: { tone: "crit", label: "CRISIS ZONE" },
  caution: { tone: "warn", label: "THREAT NEARBY" },
  outside: { tone: "muted", label: "OUT OF AREA" },
};

/**
 * Horizontal Operations bar — the app's single navigation surface.
 * Brand + operations links on the left; mission status, dispatch
 * channel, theme switch and session on the right. Glassmorphism over
 * the scrolling page (page content passes beneath the blur layer).
 *
 * On <xl screens the labels collapse to icon-only; the mobile drawer
 * (PageShell's slide-over) takes over below lg.
 */
export default function TopNav({ safetyVerdict, onOpenSafety, onOpenNav }) {
  const { user } = useUser();

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : (user?.emailAddresses?.[0]?.emailPrefix || "Responder");

  const verdict = safetyVerdict ? VERDICT_META[safetyVerdict] : null;

  return (
    <header className="glass-bar sticky top-0 z-[900] flex h-16 shrink-0 items-center gap-2 px-3 sm:px-5">
      {/* Mobile navigation trigger */}
      {onOpenNav && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onOpenNav}
          aria-label="Open navigation menu"
          className="lg:hidden"
        >
          <Menu size={18} aria-hidden="true" />
        </Button>
      )}

      {/* Brand */}
      <Link
        to="/"
        className="flex shrink-0 items-center gap-2.5 rounded-lg px-1.5 py-1 transition-opacity hover:opacity-90"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-ops-line-strong)] bg-[var(--color-ops-accent-dim)]">
          <ShieldCheck size={19} strokeWidth={1.8} className="text-[var(--color-ops-accent)]" aria-hidden="true" />
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate font-display text-[15px] font-semibold leading-tight tracking-tight text-[var(--color-ops-text)]">
            Disaster Grid
          </span>
          <span className="mt-px block truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-ops-muted)]">
            Emergency Intelligence
          </span>
        </span>
      </Link>

      <span aria-hidden="true" className="mx-1 hidden h-7 w-px bg-[var(--color-ops-line-strong)] lg:block" />

      {/* Horizontal operations nav — labels compact, scrollbar hidden */}
      <nav
        aria-label="Operations"
        className="no-scrollbar min-w-0 flex-1 lg:overflow-x-auto"
      >
        <ul className="hidden items-center gap-0.5 lg:flex">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  title={item.name}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-medium tracking-wide transition-colors ${
                      isActive
                        ? "bg-[var(--color-ops-overlay)] text-[var(--color-ops-accent)]"
                        : "text-[var(--color-ops-secondary)] hover:bg-[var(--color-ops-raised)] hover:text-[var(--color-ops-text)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={13.5} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      <span className={`hidden truncate xl:inline ${isActive ? "" : "font-normal"}`}>
                        {item.name}
                      </span>
                      {/* Active underline indicator on the bar */}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-2.5 -bottom-[9px] h-0.5 rounded-full bg-[var(--color-ops-accent)] transition-opacity duration-200 ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {/* Mobile / tablet: keep the flexible space for action alignment */}
        <div className="lg:hidden" />
      </nav>

      {/* Mission status + session */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {verdict && onOpenSafety && (
          <button
            type="button"
            onClick={onOpenSafety}
            title="Open your location safety briefing"
            className="max-w-full cursor-pointer transition-opacity hover:opacity-85"
          >
            <Badge tone={verdict.tone}>
              <MapPin size={10} aria-hidden="true" />
              <span className="truncate">{verdict.label}</span>
            </Badge>
          </button>
        )}

        <div className="hidden items-center gap-2 text-xs text-[var(--color-ops-secondary)] md:flex">
          <Radio size={14} className="text-[var(--color-ops-safe)]" aria-hidden="true" />
          <span className="font-mono text-[10px] font-bold tracking-[0.08em]">LIVE</span>
          <span className="live-dot live-dot--live" aria-hidden="true" />
        </div>

        {/* Dispatch alert channel */}
        <DispatchBell />

        <ThemeToggle />

        {/* Session — the sign-in entry points live on the AuthGate screen,
            so this never renders an unreachable duplicate control. */}
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right 2xl:block">
            <p className="max-w-[10rem] truncate text-xs font-medium text-[var(--color-ops-text)]">
              {displayName}
            </p>
            <p className="mt-px text-[10px] font-light text-[var(--color-ops-safe)]">
              Authorized responder
            </p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}

/**
 * Dispatch channel bell. Isolated so the polling interval never re-renders
 * the whole bar.
 */
function DispatchBell() {
  const [dispatches, setDispatches] = useState([]);

  useEffect(() => {
    let active = true;

    const load = () => {
      apiGet("/api/dispatch/?active_only=true")
        .then((data) => {
          if (active) setDispatches(data.dispatches || []);
        })
        .catch(() => {});
    };

    load();
    const timer = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Dispatch alerts (${dispatches.length} active)`}
          className="relative"
        >
          <Bell size={16} aria-hidden="true" />
          {dispatches.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 animate-in zoom-in-50 items-center justify-center rounded-full bg-[var(--color-ops-sos)] px-0.5 font-mono text-[8px] font-bold text-white">
              {dispatches.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent>
        <div className="border-b border-[var(--color-ops-line)] px-4 py-3">
          <p className="panel-title flex items-center gap-2">
            <Siren size={12} className="text-[var(--color-ops-crit)]" aria-hidden="true" />
            DISPATCH ALERT CHANNEL
          </p>
          <p className="panel-sub mt-0.5">Active SOS tickets on the response grid</p>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {dispatches.length === 0 && (
            <p className="flex flex-col items-center gap-2 px-2 py-8 text-center text-xs text-[var(--color-ops-muted)]">
              <Inbox size={20} aria-hidden="true" />
              No active rescue dispatches.
            </p>
          )}

          {dispatches.map((dispatch) => (
            <article
              key={dispatch.id}
              className="reveal mb-1.5 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="data-value min-w-0 truncate text-xs text-[var(--color-ops-text)]">
                  {dispatch.id}
                </span>
                <Badge tone="crit">{String(dispatch.urgency).toUpperCase()}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-[var(--color-ops-secondary)]">
                {dispatch.disaster_type} · {dispatch.location_label}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--color-ops-muted)]">
                UNIT: {dispatch.assigned_units?.[0]?.unit || "ROUTING"} · ETA{" "}
                {dispatch.assigned_units?.[0]?.eta_minutes ?? "--"} MIN
              </p>
            </article>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
