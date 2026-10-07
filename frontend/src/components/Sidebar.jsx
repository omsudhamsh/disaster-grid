import { useState } from "react";
import { GraduationCap, ShieldCheck, ShieldQuestion } from "lucide-react";
import { NavLink } from "react-router-dom";
import { UserButton, useUser } from "@clerk/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { navigation } from "@/components/nav-items";
import { PrivacyPolicyModal, TeamDetailsModal } from "@/components/ProjectInfoModals";

/*
 * Operations navigation body. On desktop the links live in the TopNav
 * horizontal bar; this body is the small-screen slide-over drawer (see
 * PageShell), carrying the same links plus session + project info.
 */
function SidebarBody({ onNavigate }) {
  const { user, isLoaded } = useUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "Guest";
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const openInfo = (setter) => () => {
    setter(true);
    onNavigate?.();
  };

  return (
    <>
      {/* Brand */}
      <div className="shrink-0 border-b border-[var(--color-ops-line)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-ops-line-strong)] bg-[var(--color-ops-accent-dim)]">
            <ShieldCheck size={21} strokeWidth={1.8} className="text-[var(--color-ops-accent)]" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold tracking-tight text-[var(--color-ops-text)]">
              Disaster Grid
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ops-muted)]">
              Emergency Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Operations">
        <p className="eyebrow mb-3 px-3">Operations</p>

        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group relative flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "border-[var(--color-ops-line-strong)] bg-[var(--color-ops-overlay)] font-medium text-[var(--color-ops-text)]"
                        : "border border-transparent text-[var(--color-ops-secondary)] hover:bg-[var(--color-ops-raised)] hover:text-[var(--color-ops-text)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--color-ops-accent)] transition-opacity ${
                          isActive ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <Icon size={17} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                      <span className="min-w-0 truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: status, project info, session */}
      <div className="shrink-0 space-y-2.5 border-t border-[var(--color-ops-line)] p-4">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] px-3 py-2.5">
          <span className="live-dot live-dot--live" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-xs text-[var(--color-ops-secondary)]">System Status</p>
            <p className="mt-0.5 truncate text-xs font-medium text-[var(--color-ops-safe)]">
              Operational
            </p>
          </div>
        </div>

        {/* Privacy Policy + Team Details — one action each, no duplicates */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openInfo(setPrivacyOpen)}
            className="min-w-0 px-2 text-[10px] font-semibold tracking-wide"
          >
            <ShieldQuestion size={12} aria-hidden="true" />
            <span className="min-w-0 truncate">Privacy Policy</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openInfo(setTeamOpen)}
            className="min-w-0 px-2 text-[10px] font-semibold tracking-wide"
          >
            <GraduationCap size={12} aria-hidden="true" />
            <span className="min-w-0 truncate">Team Details</span>
          </Button>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-[var(--color-ops-secondary)]">
              {isLoaded ? email : "Session loading…"}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[10px] text-[var(--color-ops-muted)]">
              {isLoaded ? (
                <>
                  <Badge tone="safe">Active</Badge>
                  <span className="truncate">SECURE SESSION</span>
                </>
              ) : (
                "AWAITING AUTH"
              )}
            </p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <PrivacyPolicyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <TeamDetailsModal open={teamOpen} onClose={() => setTeamOpen(false)} />
    </>
  );
}

export { SidebarBody };
