import { cn } from "@/lib/utils";

/*
 * shadcn/ui Card primitives, re-skinned for the ops console: raised
 * surfaces with hairline borders, optional glass treatment for panels that
 * float over scrolling content.
 */
function Card({ className, glass = false, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-ops-line)]",
        glass
          ? "glass-chip shadow-[0_10px_30px_rgba(2,6,23,0.35)]"
          : "bg-[var(--color-ops-panel)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-ops-line)] px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

function CardBody({ className, ...props }) {
  return <div className={cn("p-4", className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

function SectionHeading({ eyebrow, title, subtitle, action, className }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-balance text-[var(--color-ops-text)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-ops-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export { Card, CardHeader, CardBody, CardFooter, SectionHeading };