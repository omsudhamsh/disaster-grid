import { cn } from "@/lib/utils";

function FieldLabel({ className, ...props }) {
  return (
    <label
      className={cn(
        "mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ops-muted)]",
        className
      )}
      {...props}
    />
  );
}

function FieldHint({ className, ...props }) {
  return (
    <p className={cn("mt-1.5 text-[11px] leading-relaxed text-[var(--color-ops-muted)]", className)} {...props} />
  );
}

const inputClasses =
  "w-full rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-bg)] px-3 text-[13px] text-[var(--color-ops-text)] outline-none transition-colors placeholder:text-[#475569] focus-visible:border-[var(--color-ops-accent-dim)] disabled:opacity-50";

function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(inputClasses, "h-10", className)}
      {...props}
    />
  );
}

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(inputClasses, "resize-none py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

function Select({ className, children, ...props }) {
  return (
    <select className={cn(inputClasses, "h-10 cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

/**
 * Toggle chip used for multi-select filters. Constrained with
 * `max-w-full` + wrapping label so long option text can never push a
 * sibling control outside its container.
 */
function Chip({ active = false, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex max-w-full shrink items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-[var(--color-ops-accent-dim)] bg-[rgba(76,141,255,0.14)] text-[#9ecbff]"
          : "border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] text-[var(--color-ops-secondary)] hover:border-[var(--color-ops-line-strong)] hover:text-[var(--color-ops-text)]",
        className
      )}
      {...props}
    >
      <span className="min-w-0 break-words">{children}</span>
    </button>
  );
}

export { FieldLabel, FieldHint, Input, Textarea, Select, Chip };