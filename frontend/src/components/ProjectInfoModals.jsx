import {
  ShieldCheck,
  GraduationCap,
  Users,
  Building2,
  UserRound,
  Lock,
  MapPin,
  Database,
  Globe2,
  ShieldQuestion,
} from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Project information modals: Privacy Policy and Team Details.
 *
 * Built on the shadcn/ui Dialog so the panel owns its own focus trap,
 * scroll region and action footer. Both are self-contained, controlled and
 * dismissible via the close button, the footer button, Esc or a scrim
 * click — no dead controls.
 */

function InfoDialog({ open, onClose, icon: Icon, accent, eyebrow, title, subtitle, children, footer }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent closeLabel={`Close ${title}`}>
        <DialogHeader>
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-lg border"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
              background: `color-mix(in srgb, ${accent} 10%, transparent)`,
            }}
          >
            <Icon size={20} style={{ color: accent }} aria-hidden="true" />
          </span>

          <div className="min-w-0 pr-8">
            <p className="eyebrow">{eyebrow}</p>
            <DialogTitle className="mt-1">{title}</DialogTitle>
            {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
          </div>
        </DialogHeader>

        <DialogBody>{children}</DialogBody>

        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */
/* Privacy Policy                                                    */
/* ---------------------------------------------------------------- */

const PRIVACY_SECTIONS = [
  {
    icon: Database,
    title: "Information we process",
    body:
      "Disaster Grid processes the incident reports, crisis messages and imagery you submit, plus the operational account details handled by our authentication provider (name and e-mail). Imagery uploads are stored in a dedicated Supabase bucket for assessment records.",
  },
  {
    icon: MapPin,
    title: "Location data",
    body:
      "Your precise GPS position is read only when you trigger a safety check or send a rescue dispatch, and only with your explicit browser permission. It is used to compute the 10 km radius check and to route response units. Your live position is never written to the operations datastore; only a dispatch ticket you explicitly send carries coordinates.",
  },
  {
    icon: Globe2,
    title: "Third-party feeds",
    body:
      "The platform consumes publicly available disaster data from NASA (EONET, GIBS), USGS, GDACS, Open-Meteo, Google News and Reddit. No personal data is transmitted to these services. Query metadata (your IP, via standard HTTPS) is subject to those providers' own policies.",
  },
  {
    icon: Lock,
    title: "What we never do",
    body:
      "No advertising, no commercial profiling, no sale of data, and no sharing of responder identities with third parties. All processing exists to support disaster response operations and this academic evaluation.",
  },
  {
    icon: ShieldCheck,
    title: "Retention & your choices",
    body:
      "Incident reports and dispatch tickets are retained while the operations grid stays active and for academic evaluation. You may request correction or removal of your submissions at any time via the project guide listed under Team Details.",
  },
];

export function PrivacyPolicyModal({ open, onClose }) {
  return (
    <InfoDialog
      open={open}
      onClose={onClose}
      icon={ShieldCheck}
      accent="var(--color-ops-safe)"
      eyebrow="Disaster Grid"
      title="Privacy Policy"
      subtitle="How the platform handles your data"
      footer={
        <Button type="button" variant="default" onClick={onClose} block className="sm:w-auto">
          Close
        </Button>
      }
    >
      <p className="max-w-prose text-xs leading-6 text-[var(--color-ops-secondary)]">
        Disaster Grid is a final-year academic emergency-response platform. This summary
        explains, in plain language, what the system processes and the safeguards applied
        across every module.
      </p>

      <div className="mt-4 space-y-3">
        {PRIVACY_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <article
              key={section.title}
              className="rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Icon size={13} className="shrink-0 text-[var(--color-ops-safe)]" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-[var(--color-ops-text)]">{section.title}</h3>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[var(--color-ops-secondary)]">
                {section.body}
              </p>
            </article>
          );
        })}
      </div>

      <p className="mt-4 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-3 py-2.5 font-mono text-[10px] leading-relaxed text-[var(--color-ops-muted)]">
        LAST REVIEWED OCTOBER 2026 · APPLIES TO ALL MODULES (MAP, IMAGERY, SENSORS,
        FUSION, DISPATCH) · ACADEMIC USE ONLY
      </p>
    </InfoDialog>
  );
}

/* ---------------------------------------------------------------- */
/* Team Details                                                      */
/* ---------------------------------------------------------------- */

const TEAM = {
  members: [
    { name: "Padma Om Sudhamsh", roll: "23H51A66DP" },
    { name: "Sanapathi Sricharan", roll: "23H51A66B9" },
    { name: "Madasu Ram Charan", roll: "23H51A6640" },
  ],
  department: "Computer Science and Engineering (AI & ML)",
  guide: {
    name: "Mrs. B. Sujani",
    designation: "Assistant Professor",
    department: "Dept. of CSE (AI & ML)",
  },
};

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

export function TeamDetailsModal({ open, onClose }) {
  return (
    <InfoDialog
      open={open}
      onClose={onClose}
      icon={GraduationCap}
      accent="var(--color-ops-accent)"
      eyebrow="Project Team"
      title="Team Details"
      subtitle="Disaster Grid — Multimodal Disaster Response Platform"
      footer={
        <Button type="button" variant="default" onClick={onClose} block className="sm:w-auto">
          Close
        </Button>
      }
    >
      <section>
        <h3 className="eyebrow flex items-center gap-2">
          <Users size={12} aria-hidden="true" />
          Team Members
        </h3>

        <ul className="mt-2 space-y-2">
          {TEAM.members.map((member) => (
            <li
              key={member.roll}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-ops-overlay)] font-mono text-[11px] font-bold text-[var(--color-ops-accent)]"
                >
                  {initials(member.name)}
                </span>
                <span className="min-w-0 truncate text-xs font-semibold text-[var(--color-ops-text)]">
                  {member.name}
                </span>
              </div>
              <Badge tone="info">{member.roll}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3">
        <h3 className="eyebrow flex items-center gap-2">
          <Building2 size={12} aria-hidden="true" />
          Department
        </h3>
        <p className="mt-1.5 text-xs leading-5 text-[var(--color-ops-secondary)]">
          {TEAM.department}
        </p>
      </section>

      <section className="mt-3 rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3">
        <h3 className="eyebrow flex items-center gap-2">
          <UserRound size={12} aria-hidden="true" />
          Project Guide
        </h3>
        <p className="mt-1.5 text-xs font-semibold text-[var(--color-ops-text)]">{TEAM.guide.name}</p>
        <p className="mt-0.5 text-[11px] leading-5 text-[var(--color-ops-secondary)]">
          {TEAM.guide.designation}, {TEAM.guide.department}
        </p>
      </section>

      <p className="mt-4 flex items-start gap-2 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-3 py-2.5 font-mono text-[10px] leading-relaxed text-[var(--color-ops-muted)]">
        <ShieldQuestion size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
        For data requests or academic evaluation queries, contact the project guide listed
        above.
      </p>
    </InfoDialog>
  );
}