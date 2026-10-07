import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

/*
 * shadcn/ui Dialog built on Radix.
 *
 * Layout contract that fixes the original overflow bug: the panel is a
 * `flex-col` with a capped height, the header and footer are `shrink-0`
 * and the body is the only `flex-1 overflow-y-auto` region. DialogFooter
 * wraps and stacks, and its buttons carry `min-w-0` + wrapping labels, so
 * no action can ever escape the panel at any viewport width.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-[1200] bg-[var(--color-ops-bg)]/80 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

const DialogContent = React.forwardRef(function DialogContent(
  {
    className,
    children,
    showClose = true,
    closeLabel = "Close dialog",
    ...props
  },
  ref
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "glass-pop fixed left-1/2 top-1/2 z-[1250] flex w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl",
          "max-h-[calc(100dvh-2rem)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          "data-[state=open]:slide-in-from-bottom-3 data-[state=closed]:slide-out-to-bottom-2",
          className
        )}
        {...props}
      >
        {children}

        {showClose && (
          <DialogPrimitive.Close asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={closeLabel}
              className="absolute right-3 top-3 text-[var(--color-ops-muted)]"
            >
              <X size={16} />
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-start gap-3 border-b border-[var(--color-ops-line)] px-6 py-5",
        className
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5",
        className
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-6 py-4",
        "sm:flex-row sm:flex-wrap sm:items-center sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

/**
 * Left-hand slide-over used for navigation on small screens. Radix still
 * owns the focus trap, Esc handling and scroll lock; only the geometry
 * differs from DialogContent.
 */
const DialogDrawer = React.forwardRef(function DialogDrawer({ className, children, ...props }, ref) {
  return (
    <DialogPortal>
      <DialogOverlay className="bg-[var(--color-ops-bg)]/75" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "glass-pop fixed inset-y-0 left-0 z-[1250] flex w-[min(19rem,85vw)] flex-col overflow-hidden rounded-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-sm font-semibold leading-tight text-balance text-[var(--color-ops-text)]",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-1 text-[11px] leading-relaxed text-[var(--color-ops-muted)]", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogDrawer,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};