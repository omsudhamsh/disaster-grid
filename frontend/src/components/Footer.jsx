import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { navigation } from "./nav-items";
import { PrivacyPolicyModal, TeamDetailsModal } from "./ProjectInfoModals";
import { PROVIDERS } from "@/lib/providers";

const CONTRIBUTORS = [
  { name: "Padma Om Sudhamsh", role: "Lead · Full-stack & Vision" },
  { name: "Sanapathi Sricharan", role: "NLP & Crisis Intelligence" },
  { name: "Madasu Ram Charan", role: "Sensors & Fusion" },
];

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

/**
 * Application footer — a clean, dark, multi-column brand footer
 * (Swiggy-style): bold Disaster Grid wordmark, link columns, contributor
 * profiles, a single GitHub handle, and a bottom legal bar. Rendered once
 * by the PageShell on every page.
 */
export default function Footer() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const platformLinks = navigation.slice(0, 4);
  const moduleLinks = navigation.slice(4);

  return (
    <footer className="mt-10 border-t border-[var(--color-ops-line)] bg-[var(--color-ops-panel)]">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand block */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-ops-line-strong)] bg-[var(--color-ops-accent-dim)]">
                <ShieldCheck
                  size={20}
                  strokeWidth={1.8}
                  className="text-[var(--color-ops-accent)]"
                  aria-hidden="true"
                />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold tracking-tight text-[var(--color-ops-text)]">
                  Disaster Grid
                </span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-ops-muted)]">
                  Emergency Intelligence
                </span>
              </span>
            </div>

            <p className="mt-4 max-w-xs text-xs leading-relaxed text-[var(--color-ops-secondary)]">
              A multimodal disaster-response platform fusing satellite
              feeds, ground sensors and bot-screened social intelligence into
              one operational grid across India.
            </p>

            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://github.com/omsudhamsh/disaster-grid"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Disaster Grid on GitHub"
                title="Disaster Grid on GitHub"
                className="flex size-8 items-center justify-center rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] text-[var(--color-ops-secondary)] transition-colors hover:border-[var(--color-ops-line-strong)] hover:text-[var(--color-ops-text)]"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.17-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.1-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.61 1.59.38 2.8.19 3.05.73.8 1.17 2.8 1.18 3.09 0 .82.08 2.7-.07 3.88-.29 2.11-1.68 3.42-3.35 3.62 1.87 1.05 3.28 2.4 3.28 4.86v.13c0 .3-.21.63-.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Platform links */}
          <div className="lg:col-span-2">
            <p className="panel-title">PLATFORM</p>
            <ul className="mt-4 space-y-2.5">
              {platformLinks.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-xs text-[var(--color-ops-secondary)] transition-colors hover:text-[var(--color-ops-text)]"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Modules */}
          <div className="lg:col-span-3">
            <p className="panel-title">MODULES</p>
            <ul className="mt-4 space-y-2.5">
              {moduleLinks.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-xs text-[var(--color-ops-secondary)] transition-colors hover:text-[var(--color-ops-text)]"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Project + contributors */}
          <div className="lg:col-span-3">
            <p className="panel-title">PROJECT</p>
            <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-ops-secondary)]">
              Multimodal Disaster Response Platform. Live incident
              intelligence is restricted to authorized responders.
            </p>

            <ul className="mt-4 space-y-2">
              {CONTRIBUTORS.map((person) => (
                <li key={person.name} className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-ops-overlay)] font-mono text-[9px] font-bold text-[var(--color-ops-accent)]"
                  >
                    {initials(person.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-medium text-[var(--color-ops-text)]">
                      {person.name}
                    </span>
                    <span className="block truncate text-[9px] font-mono uppercase tracking-wide text-[var(--color-ops-muted)]">
                      {person.role}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="btn btn-ghost h-8 px-3 text-[10px]"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setTeamOpen(true)}
                className="btn btn-ghost h-8 px-3 text-[10px]"
              >
                Team Details
              </button>
            </div>
          </div>
        </div>

        {/* Data & AI attribution strip */}
        <div className="mt-10 border-t border-[var(--color-ops-line)] pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="panel-title mr-2">DATA &amp; AI</p>
            {PROVIDERS.map((provider) => (
              <Link
                key={provider.id}
                to="/attribution"
                title={`${provider.name} — ${provider.role}`}
                className="flex items-center gap-1.5 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] py-1 pl-1 pr-2.5 transition-colors hover:border-[var(--color-ops-line-strong)]"
              >
                <span
                  aria-hidden="true"
                  className="flex size-5 items-center justify-center rounded font-mono text-[9px] font-bold"
                  style={{
                    color: provider.tint,
                    background: `color-mix(in srgb, ${provider.tint} 16%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${provider.tint} 38%, transparent)`,
                  }}
                >
                  {provider.mark}
                </span>
                <span className="text-[10px] font-medium text-[var(--color-ops-secondary)]">
                  {provider.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-[var(--color-ops-line)] pt-6 sm:flex-row">
          <p className="font-mono text-[10px] tracking-wide text-[var(--color-ops-muted)]">
            © {new Date().getFullYear()} Disaster Grid · All rights reserved
          </p>
          <span className="flex items-center gap-2 font-mono text-[10px] font-semibold text-[var(--color-ops-safe)]">
            <span className="live-dot live-dot--live" aria-hidden="true" />
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>
      </div>

      <PrivacyPolicyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <TeamDetailsModal open={teamOpen} onClose={() => setTeamOpen(false)} />
    </footer>
  );
}
