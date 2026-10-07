import {
  Activity,
  AlertTriangle,
  GitMerge,
  Image,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Truck,
} from "lucide-react";

/**
 * Single source of truth for the operations console navigation.
 * The sidebar renders the links; the navbar reads `title`/`subtitle`
 * from the active route so the two can never drift apart.
 */
export const navigation = [
  {
    name: "Command Center",
    path: "/",
    icon: LayoutDashboard,
    title: "Command Center",
    subtitle: "Real-time disaster response overview · PAN India",
  },
  {
    name: "Live Incidents",
    path: "/incidents",
    icon: AlertTriangle,
    title: "Live Incidents",
    subtitle: "Monitor, verify and prioritise incoming disaster reports",
  },
  {
    name: "Crisis Intelligence",
    path: "/crisis",
    icon: MessageSquare,
    title: "Crisis Intelligence",
    subtitle: "AI-screened social signals and broadcast bulletins",
  },
  {
    name: "Imagery Analysis",
    path: "/imagery",
    icon: Image,
    title: "Imagery Analysis",
    subtitle: "Satellite and drone captures with vision-model assessment",
  },
  {
    name: "Sensor Network",
    path: "/sensors",
    icon: Activity,
    title: "Sensor Network",
    subtitle: "Ground station telemetry and threshold alerts",
  },
  {
    name: "Multimodal Fusion",
    path: "/fusion",
    icon: GitMerge,
    title: "Multimodal Fusion",
    subtitle: "Fuse imagery, sensor and social evidence into one picture",
  },
  {
    name: "Resources",
    path: "/resources",
    icon: Truck,
    title: "Response Resources",
    subtitle: "Deploy and confirm relief units against active incidents",
  },
  {
    name: "Data & AI Sources",
    path: "/attribution",
    icon: Layers,
    title: "Data & AI Sources",
    subtitle: "Providers powering the platform's feeds, models and storage",
  },
];

export function matchRoute(pathname) {
  return (
    navigation.find((item) =>
      item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
    ) || navigation[0]
  );
}