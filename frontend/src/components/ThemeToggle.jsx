import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toggleTheme, useTheme } from "@/services/theme";

/**
 * Dark / light theme switch. Persists via the theme store (localStorage +
 * <html data-theme>) and survives reloads through the inline bootstrap in
 * index.html. The sun/moon icons crossfade and rotate on change.
 */
export default function ThemeToggle({ className }) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`relative overflow-hidden ${className || ""}`}
    >
      <Sun
        size={16}
        aria-hidden="true"
        className={`absolute transition-all duration-300 ease-out ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        size={16}
        aria-hidden="true"
        className={`transition-all duration-300 ease-out ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </Button>
  );
}
