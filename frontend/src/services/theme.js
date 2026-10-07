import { useEffect, useState } from "react";

/*
 * Theme store: `dark` (AMOLED) is the console default, `light` is the
 * adaptive off-white mode. The choice persists in localStorage and is
 * applied to <html data-theme> by the inline bootstrap in index.html,
 * so there is never a flash of the wrong theme on load.
 */

const STORAGE_KEY = "dg-theme";
const listeners = new Set();

export function getTheme() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(next) {
  if (next !== "dark" && next !== "light") return;
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable (private mode) — theme still applies for the session */
  }
  listeners.forEach((listener) => listener(next));
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

/** Reactive theme value for components that need to react (e.g. map colors). */
export function useTheme() {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    const listener = (next) => setThemeState(next);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  return theme;
}

/*
 * Read the current theme's map palette straight from the CSS tokens so
 * Leaflet's SVG layers (markers, rings, masks) always match the active
 * theme. Called on every theme change; cheap (one getComputedStyle).
 */
export function mapPalette() {
  const styles = getComputedStyle(document.documentElement);

  return {
    bg: styles.getPropertyValue("--color-ops-bg").trim() || "#000000",
    panel: styles.getPropertyValue("--color-ops-panel").trim() || "#0b0d12",
    text: styles.getPropertyValue("--color-ops-text").trim() || "#f4f6fa",
    secondary: styles.getPropertyValue("--color-ops-secondary").trim() || "#9ba4b5",
    muted: styles.getPropertyValue("--color-ops-muted").trim() || "#6e7787",
    accent: styles.getPropertyValue("--color-ops-accent").trim() || "#4da3ff",
    safe: styles.getPropertyValue("--color-ops-safe").trim() || "#3ddc97",
    warn: styles.getPropertyValue("--color-ops-warn").trim() || "#ffb454",
    crit: styles.getPropertyValue("--color-ops-crit").trim() || "#ff5c73",
    moderate: styles.getPropertyValue("--color-ops-moderate").trim() || "#e3c341",
    lineStrong: styles.getPropertyValue("--color-ops-line-strong").trim() || "rgba(255,255,255,0.17)",
  };
}
