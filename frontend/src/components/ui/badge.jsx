import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * shadcn/ui Badge — mono, uppercase status chips mapped onto the ops
 * semantic palette (safe / warn / crit / info / muted). Every tone
 * derives from the theme tokens, so both the AMOLED dark and the
 * off-white light mode keep AA contrast (tinted chip bg + dedicated
 * -text tokens for label contrast).
 */
const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        safe: "border-[color-mix(in_srgb,var(--color-ops-safe)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-safe)_12%,transparent)] text-[var(--color-ops-safe-text)]",
        warn: "border-[color-mix(in_srgb,var(--color-ops-warn)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-warn)_14%,transparent)] text-[var(--color-ops-warn-text)]",
        crit: "border-[color-mix(in_srgb,var(--color-ops-crit)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-crit)_12%,transparent)] text-[var(--color-ops-crit-text)]",
        info: "border-[color-mix(in_srgb,var(--color-ops-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-info)_12%,transparent)] text-[var(--color-ops-info-text)]",
        muted:
          "border-[color-mix(in_srgb,var(--color-ops-secondary)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-ops-secondary)_8%,transparent)] text-[var(--color-ops-secondary)]",
      },
    },
    defaultVariants: { tone: "muted" },
  }
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
