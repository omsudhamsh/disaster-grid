import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * shadcn/ui Button (cva variants) re-skinned for the Disaster Grid ops
 * palette. Variant names mirror the previous `.btn-*` utility classes so
 * markup semantics stay unchanged while gaining consistent sizing,
 * `asChild` composition and guaranteed non-wrapping labels.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-[12px] font-medium tracking-[0.02em] cursor-pointer select-none transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-ops-accent)] text-[var(--color-ops-accent-contrast)] shadow-[inset_0_1px_0_var(--color-ops-highlight),0_1px_2px_var(--color-ops-shadow)] hover:bg-[var(--color-ops-accent-strong)]",
        sos: "bg-[var(--color-ops-sos)] text-white shadow-[inset_0_1px_0_var(--color-ops-highlight),0_1px_2px_var(--color-ops-shadow)] hover:bg-[var(--color-ops-sos-strong)]",
        neutral:
          "border border-[var(--color-ops-line-strong)] bg-[var(--color-ops-raised)] text-[var(--color-ops-text)] hover:bg-[var(--color-ops-overlay)]",
        outline:
          "border border-[var(--color-ops-line)] bg-transparent text-[var(--color-ops-secondary)] hover:border-[var(--color-ops-line-strong)] hover:bg-[var(--color-ops-raised)] hover:text-[var(--color-ops-text)]",
        ghost: "text-[var(--color-ops-secondary)] hover:bg-[var(--color-ops-raised)] hover:text-[var(--color-ops-text)]",
        link: "text-[var(--color-ops-accent)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[11px]",
        default: "h-10 px-4",
        lg: "h-11 px-5 text-[13px]",
        icon: "size-10 p-0",
        "icon-sm": "size-8 p-0",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}