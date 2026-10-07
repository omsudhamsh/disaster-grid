import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn/ui class combiner: conditional class names with Tailwind conflict
 * resolution, so a caller's `className` always wins over a variant default.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}