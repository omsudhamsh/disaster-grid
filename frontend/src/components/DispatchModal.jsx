import { useState } from "react";
import { Check, Copy, Loader2, Siren } from "lucide-react";

import { apiPost } from "../services/api";
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
import { Chip, FieldLabel, Input, Select, Textarea } from "@/components/ui/input";

const NEED_OPTIONS = [
  "Rescue",
  "Medical",
  "Evacuation",
  "Food",
  "Water",
  "General Assistance",
];

const URGENCY_OPTIONS = ["Low", "Moderate", "High", "Critical"];

/**
 * "Request Rescue Dispatch" — the SOS pipeline for the response grid.
 * The reporter confirms position, urgency and needs; the backend turns
 * the request into a dispatch ticket, routes the nearest response units
 * with planning ETAs and raises the alert on the command channel.
 */
export default function DispatchModal({ open, onClose, prefill: prefillProp }) {
  // SafetyCheckModal passes undefined until a GPS fix exists; never read
  // fields off a null/undefined prefill.
  const prefill = prefillProp || {};
  const [needs, setNeeds] = useState(() => ["Rescue"]);
  const [urgency, setUrgency] = useState(() => prefill.urgency || "High");
  const [people, setPeople] = useState(() => prefill.people ?? "");
  const [notes, setNotes] = useState(() => prefill.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);
  const [copied, setCopied] = useState(false);

  const toggleNeed = (need) => {
    setNeeds((current) =>
      current.includes(need) ? current.filter((item) => item !== need) : [...current, need]
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const data = await apiPost("/api/dispatch/", {
        latitude: prefill.latitude,
        longitude: prefill.longitude,
        location_label: prefill.locationLabel || "Recorded GPS position",
        disaster_type: prefill.disasterType || "General Emergency",
        urgency,
        priority: urgency === "Critical" ? 92 : urgency === "High" ? 80 : 55,
        people: Number(people) || 0,
        needs: needs.length ? needs : ["General Assistance"],
        notes,
        reporter: "Signed-in responder",
        incident_id: prefill.incidentId || null,
      });
      setTicket(data.dispatch);
    } catch (dispatchError) {
      setError(dispatchError.message || "Dispatch request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyRelay = async () => {
    try {
      await navigator.clipboard.writeText(ticket.relay_text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // Dismissing resets the whole ticket so the next request always starts
  // from a clean, prefill-driven form instead of the previous submission.
  const close = () => {
    setTicket(null);
    setError("");
    setSubmitting(false);
    setNeeds(["Rescue"]);
    setUrgency(prefill.urgency || "High");
    setPeople(prefill.people ?? "");
    setNotes(prefill.notes || "");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-lg" closeLabel={ticket ? "Close dispatch receipt" : "Cancel dispatch request"}>
        {ticket ? (
          <>
            <DialogHeader>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-ops-safe)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-safe)_10%,transparent)]">
                <Check size={20} className="text-[var(--color-ops-safe)]" aria-hidden="true" />
              </span>

              <div className="min-w-0 pr-8">
                <p className="eyebrow">Dispatch confirmed</p>
                <DialogTitle className="mt-1">Ticket {ticket.id} is live on the response grid</DialogTitle>
                <DialogDescription className="sr-only">
                  Routed response units, distances and estimated arrival times for this dispatch.
                </DialogDescription>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-3">
              <div className="rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3">
                <p className="eyebrow">Routed response units</p>
                <div className="mt-2 space-y-2">
                  {ticket.assigned_units.map((unit, index) => (
                    <div
                      key={unit.unit_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-ops-text)]">
                          {index === 0 && <Badge tone="safe">PRIMARY</Badge>}
                          <span className="min-w-0 break-words">{unit.unit}</span>
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--color-ops-muted)]">
                          {unit.capability} · {unit.base}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="data-value text-xs text-[var(--color-ops-text)]">
                          {unit.distance_km} km
                        </p>
                        <p className="font-mono text-[10px] text-[var(--color-ops-secondary)]">
                          ETA {unit.eta_minutes} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow">Relay text (any channel)</p>
                  <Button type="button" variant="outline" size="sm" onClick={copyRelay}>
                    {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="mt-2 font-mono text-[11px] leading-relaxed break-words text-[var(--color-ops-secondary)]">
                  {ticket.relay_text}
                </p>
              </div>

              <p className="text-[11px] text-[var(--color-ops-muted)]">
                Status: <Badge tone="warn">{ticket.status.toUpperCase()}</Badge> — the command
                center now sees this ticket and can resolve it when the unit reports on scene.
              </p>
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="default" onClick={close} block className="sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-ops-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-crit)_10%,transparent)]">
                <Siren size={20} className="text-[var(--color-ops-crit)]" aria-hidden="true" />
              </span>

              <div className="min-w-0 pr-8">
                <p className="eyebrow">Emergency Dispatch Request</p>
                <DialogTitle className="mt-1">Send SOS to the response grid</DialogTitle>
                <DialogDescription className="sr-only">
                  Confirm urgency, people affected and the assistance required. Tickets route to
                  the nearest response units with ETAs.
                </DialogDescription>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <div className="rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="eyebrow">Incident position</p>
                  <Badge tone="info">GPS VERIFIED</Badge>
                </div>
                <p className="mt-1.5 text-sm font-medium text-[var(--color-ops-text)]">
                  {prefill.locationLabel || "Recorded GPS position"}
                </p>
                {prefill.latitude != null && (
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--color-ops-secondary)]">
                    {prefill.latitude.toFixed(5)}, {prefill.longitude.toFixed(5)}
                    {prefill.disasterType && prefill.disasterType !== "General Emergency"
                      ? ` · active threat: ${prefill.disasterType}`
                      : ""}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <FieldLabel htmlFor="dispatch-urgency">Urgency</FieldLabel>
                  <Select
                    id="dispatch-urgency"
                    value={urgency}
                    onChange={(event) => setUrgency(event.target.value)}
                  >
                    {URGENCY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="min-w-0">
                  <FieldLabel htmlFor="dispatch-people">People affected</FieldLabel>
                  <Input
                    id="dispatch-people"
                    type="number"
                    min="0"
                    value={people}
                    onChange={(event) => setPeople(event.target.value)}
                    placeholder="0 (unknown)"
                  />
                </div>
              </div>

              <fieldset className="min-w-0">
                <legend className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ops-muted)]">
                  Assistance required
                </legend>
                <div className="flex flex-wrap gap-2">
                  {NEED_OPTIONS.map((need) => (
                    <Chip key={need} active={needs.includes(need)} onClick={() => toggleNeed(need)}>
                      {need}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <div className="min-w-0">
                <FieldLabel htmlFor="dispatch-notes">Situation notes</FieldLabel>
                <Textarea
                  id="dispatch-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="What responders should know before arrival — access routes, hazards, headcount…"
                />
              </div>

              {error && (
                <p className="rounded-md border border-[color-mix(in_srgb,var(--color-ops-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-crit)_10%,transparent)] p-3 text-xs text-[var(--color-ops-crit-text)]">
                  {error}
                </p>
              )}
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} block className="sm:w-auto">
                Cancel
              </Button>
              <Button
                type="button"
                variant="sos"
                onClick={submit}
                disabled={submitting || prefill.latitude == null}
                aria-busy={submitting}
                block
                className="btn-wrap sm:w-auto"
              >
                {submitting ? (
                  <Loader2 size={14} className="spinner" aria-hidden="true" />
                ) : (
                  <Siren size={14} aria-hidden="true" />
                )}
                {submitting ? "Dispatching…" : "Send SOS to Response Grid"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}