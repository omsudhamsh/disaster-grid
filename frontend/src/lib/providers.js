/*
 * Provider attribution registry — every external data feed, AI model and
 * infrastructure provider the platform relies on. Displayed in the
 * "Data & AI Sources" page and the footer strip; provider names never
 * appear in the operational UI itself.
 *
 * Marks are neutral monogram tiles (no third-party logo assets bundled).
 */

export const PROVIDER_CATEGORIES = {
  ai: "AI & Vision",
  data: "Live Data Feeds",
  maps: "Maps & Geography",
  infra: "Platform Infrastructure",
};

export const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    role: "Vision damage assessment for satellite and drone imagery",
    category: "ai",
    mark: "G",
    tint: "#8ab4f8",
  },
  {
    id: "nlp",
    name: "In-house NLP Engine",
    role: "Code-mixed report understanding across Indian languages",
    category: "ai",
    mark: "N",
    tint: "#b39ddb",
  },
  {
    id: "nasa",
    name: "NASA",
    role: "Satellite imagery, daily true-colour tiles and event feeds",
    category: "data",
    mark: "N",
    tint: "#0b3d91",
  },
  {
    id: "usgs",
    name: "USGS",
    role: "Real-time seismic activity feed",
    category: "data",
    mark: "U",
    tint: "#2e7d32",
  },
  {
    id: "gdacs",
    name: "GDACS",
    role: "Official multi-hazard disaster alerts",
    category: "data",
    mark: "G",
    tint: "#c62828",
  },
  {
    id: "open-meteo",
    name: "Open-Meteo",
    role: "Live weather observations for sensor fusion",
    category: "data",
    mark: "M",
    tint: "#0277bd",
  },
  {
    id: "news",
    name: "Google News",
    role: "News desks and eNewspaper coverage",
    category: "data",
    mark: "N",
    tint: "#5f6368",
  },
  {
    id: "reddit",
    name: "Reddit",
    role: "Bot-screened community reports",
    category: "data",
    mark: "R",
    tint: "#ff4500",
  },
  {
    id: "esri",
    name: "Esri",
    role: "Cartographic basemap tiles",
    category: "maps",
    mark: "E",
    tint: "#007ac2",
  },
  {
    id: "naturalearth",
    name: "Natural Earth",
    role: "Public-domain boundary and geography data",
    category: "maps",
    mark: "E",
    tint: "#6d4c41",
  },
  {
    id: "leaflet",
    name: "Leaflet",
    role: "Interactive mapping engine",
    category: "maps",
    mark: "L",
    tint: "#199900",
  },
  {
    id: "supabase",
    name: "Supabase",
    role: "Imagery storage and analysis database",
    category: "infra",
    mark: "S",
    tint: "#3ecf8e",
  },
  {
    id: "clerk",
    name: "Clerk",
    role: "Responder authentication and session security",
    category: "infra",
    mark: "C",
    tint: "#6c47ff",
  },
];
