import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

/*
 * shadcn/ui Popover, skinned as a glass panel so it sits visually above
 * the blurred navbar instead of punching a flat hole in it.
 */
function Popover({ ...props }) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger({ ...props }) {
  return <PopoverPrimitive.Trigger {...props} />;
}

function PopoverContent({ className, align = "end", sideOffset = 8, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "glass-pop z-[1300] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };