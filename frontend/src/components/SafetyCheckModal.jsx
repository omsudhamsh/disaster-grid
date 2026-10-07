import { useEffect, useMemo, useState } from "react";
import { Globe2, Loader2, MapPin, ShieldAlert, ShieldCheck, Siren } from "lucide-react";

import { apiGet } from "../services/api";
import { useLocationContext } from "../services/locationContext";
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
import DispatchModal from "./DispatchModal";

const VERDICT_STYLES = {
  safe: { icon: ShieldCheck, tone: "var(--color-ops-safe)", chip: "safe", label: "SAFE" },
  caution: { icon: ShieldAlert, tone: "var(--color-ops-warn)", chip: "warn", label: "CAUTION" },
  danger: { icon: Siren, tone: "var(--color-ops-crit)", chip: "crit", label: "ALERT" },
  outside: { icon: Globe2, tone: "var(--color-ops-muted)", chip: "muted", label: "OUT OF AREA" },
};

/**
 * Post-login safety briefing. Resolves the responder's real GPS position,
 * runs the 10 km radius check against the live incident grid, and shows a
 * dismissible verdict card ("you are safe" / nearest threat).
 */
export default function SafetyCheckModal({ open, onClose }) {
  // Position is resolved once after login by the app-level provider.
  const { position, status, error, request } = useLocationContext();
  const [assessment, setAssessment] = useState(null);
  const [checkError, setCheckError] = useState("");
  const [dispatchOpen, setDispatchOpen] = useState(false);

  // Retrying clears the previous failure from the click handler rather than
  // from an effect, which keeps the fetch effect free of synchronous
  // setState calls.
  const retry = () => {
    setCheckError("");
    request();
  };

  useEffect(() => {
    if (!open || !position) return;

    let active = true;

    apiGet(
      `/api/geo/nearby?lat=${position.latitude.toFixed(5)}&lon=${position.longitude.toFixed(5)}&radius_km=10`
    )
      .then((data) => {
        if (active) setAssessment(data);
      })
      .catch((fetchError) => {
        if (active) setCheckError(fetchError.message || "Safety check failed");
      });

    return () => {
      active = false;
    };
  }, [open, position]);

  // Loading is derived from the request state, never synchronously set.
  const loading = status === "located" && !assessment && !checkError;

  const verdict = useMemo(() => {
    const key = assessment?.verdict || "safe";
    return VERDICT_STYLES[key] || VERDICT_STYLES.safe;
  }, [assessment]);

  const VerdictIcon = verdict.icon;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          className="max-w-md"
          closeLabel="Close safety briefing"
        >
          <DialogHeader>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-ops-line-strong)] bg-[var(--color-ops-raised)]">
              <VerdictIcon size={22} style={{ color: verdict.tone }} aria-hidden="true" />
            </span>

            <div className="min-w-0 pr-8">
              <p className="eyebrow">Location Safety Briefing</p>
              <DialogTitle className="mt-1">10 km radius check · live incident grid</DialogTitle>
              <DialogDescription className="sr-only">
                Checks your verified position against every live incident on the grid within a
                10 km radius.
              </DialogDescription>
            </div>
          </DialogHeader>

          <DialogBody>
            {status === "locating" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 size={24} className="spinner text-[var(--color-ops-accent)]" aria-hidden="true" />
                <p className="text-sm text-[var(--color-ops-secondary)]">
                  Accessing your current location…
                </p>
                <p className="font-mono text-[10px] text-[var(--color-ops-muted)]">
                  GPS FIX REQUIRED FOR THE RADIUS CHECK
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="py-4 text-center">
                <p className="text-sm text-[var(--color-ops-secondary)]">{error}</p>
                <p className="mt-2 text-xs text-[var(--color-ops-muted)]">
                  Enable location access in your browser to run the safety check.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Button type="button" variant="neutral" onClick={retry}>
                    <MapPin size={14} aria-hidden="true" />
                    Retry location
                  </Button>
                  <Button type="button" variant="default" onClick={onClose}>
                    Continue without
                  </Button>
                </div>
              </div>
            )}

            {status === "located" && loading && !assessment && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Loader2 size={24} className="spinner text-[var(--color-ops-accent)]" aria-hidden="true" />
                <p className="text-sm text-[var(--color-ops-secondary)]">
                  Cross-checking your position against the live grid…
                </p>
              </div>
            )}

            {checkError && (
              <p className="rounded-md border border-[color-mix(in_srgb,var(--color-ops-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-crit)_10%,transparent)] p-3 text-xs text-[var(--color-ops-crit-text)]">
                {checkError}
              </p>
            )}

            {assessment && (
              <div>
                <div
                  className="rounded-lg border p-4"
                  style={{
                    borderColor: `color-mix(in srgb, ${verdict.tone} 35%, transparent)`,
                    background: `color-mix(in srgb, ${verdict.tone} 8%, transparent)`,
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 text-base font-semibold text-[var(--color-ops-text)]">
                      {assessment.headline}
                    </p>
                    <Badge tone={verdict.chip}>{verdict.label}</Badge>
                  </div>

                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ops-secondary)]">
                    Position verified:{" "}
                    <span className="font-medium text-[var(--color-ops-text)]">
                      {assessment.location_label || "Recorded GPS position"}
                    </span>
                    {" · "}GPS {assessment.coordinates.latitude.toFixed(4)},{" "}
                    {assessment.coordinates.longitude.toFixed(4)} (±
                    {position?.accuracy ? `${Math.round(position.accuracy)}m` : "?"})
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniStat
                      label="IN RADIUS"
                      value={String(assessment.incidents_in_radius)}
                      hint="incidents ≤10 km"
                    />
                    <MiniStat
                      label="NEAREST"
                      value={
                        assessment.nearest_any
                          ? `${assessment.nearest_any.distance_km.toFixed(1)}km`
                          : "—"
                      }
                      hint={assessment.nearest_any?.type || "no live events"}
                    />
                    <MiniStat
                      label="DIRECTION"
                      value={assessment.nearest_any?.bearing || "—"}
                      hint="compass bearing"
                    />
                  </div>
                </div>

                {assessment.nearest_any && (
                  <div className="mt-3 rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3">
                    <p className="eyebrow">Nearest live event on the grid</p>
                    <p className="mt-1.5 text-sm font-medium text-[var(--color-ops-text)]">
                      {assessment.nearest_any.location}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-ops-secondary)]">
                      {assessment.nearest_any.type} · urgency {assessment.nearest_any.urgency} ·{" "}
                      {assessment.nearest_any.distance_km.toFixed(1)} km{" "}
                      {assessment.nearest_any.bearing} of your position
                    </p>
                  </div>
                )}

                {assessment.incidents_in_radius > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="eyebrow px-1">Events inside your 10 km radius</p>
                    {assessment.incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-[var(--color-ops-text)]">
                            {incident.location}
                          </p>
                          <p className="font-mono text-[10px] text-[var(--color-ops-muted)]">
                            {incident.type} · {incident.urgency}
                          </p>
                        </div>
                        <span className="data-value shrink-0 text-xs text-[var(--color-ops-secondary)]">
                          {incident.distance_km.toFixed(1)} km
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogBody>

          {/*
            Footer contract: the panel is a flex column, so this row keeps a
            fixed height and the two actions wrap / stack instead of pushing
            past the dialog edge. Long labels wrap via `btn-wrap`.
          */}
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="sos"
              onClick={() => setDispatchOpen(true)}
              disabled={assessment?.verdict === "outside"}
              block
              className="btn-wrap sm:w-auto"
            >
              <Siren size={14} aria-hidden="true" />
              Request Rescue Dispatch
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={onClose}
              block
              className="btn-wrap sm:w-auto"
            >
              Enter Command Center
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DispatchModal
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        prefill={
          position
            ? {
                latitude: position.latitude,
                longitude: position.longitude,
                locationLabel: assessment?.location_label || "Recorded GPS position",
                urgency: assessment?.verdict === "danger" ? "Critical" : "High",
                disasterType: assessment?.nearest_in_radius?.type || "General Emergency",
              }
            : undefined
        }
      />
    </>
  );
}

function MiniStat({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-2.5 py-2 text-center">
      <p className="font-mono text-[9px] font-semibold tracking-[0.1em] text-[var(--color-ops-muted)]">
        {label}
      </p>
      <p className="data-value mt-1 text-sm text-[var(--color-ops-text)]">{value}</p>
      <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--color-ops-muted)]">{hint}</p>
    </div>
  );
}