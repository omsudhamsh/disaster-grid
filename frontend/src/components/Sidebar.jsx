import {
  LayoutDashboard,
  AlertTriangle,
  MessageSquare,
  Image,
  Activity,
  Truck,
  ShieldCheck,
  GitMerge,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useUser } from "@clerk/react";

const navigation = [
  {
    name: "Command Center",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Live Incidents",
    path: "/incidents",
    icon: AlertTriangle,
  },
  {
    name: "Crisis Intelligence",
    path: "/crisis",
    icon: MessageSquare,
  },
  {
    name: "Imagery Analysis",
    path: "/imagery",
    icon: Image,
  },
  {
    name: "Sensor Network",
    path: "/sensors",
    icon: Activity,
  },
  {
  name: "Multimodal Fusion",
  path: "/fusion",
  icon: GitMerge,
},
  {
    name: "Resources",
    path: "/resources",
    icon: Truck,
  },
];

function Sidebar() {
  const { user, isLoaded } = useUser();
  const email = user?.emailAddresses?.[0]?.emailAddress || "Guest";

  return (
    <aside className="w-64 min-h-screen bg-slate-950 text-white flex flex-col shrink-0">

      {/* Brand */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
            <ShieldCheck size={22} strokeWidth={1.8} />
          </div>

          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Disaster Grid
            </h1>

            <p className="text-xs text-slate-400 mt-0.5">
              Emergency Intelligence
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">

        <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Operations
        </p>

        <div className="space-y-1">

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

        </div>
      </nav>

      {/* System status */}
      <div className="p-4 border-t border-slate-800 space-y-3">

        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-900">

          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>

          <div>
            <p className="text-xs text-slate-300">
              System Status
            </p>

            <p className="text-xs text-emerald-400 mt-0.5">
              Operational
            </p>
          </div>

        </div>

        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-900/60 border border-slate-800">

          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400">
            {(isLoaded ? email.charAt(0) : "?").toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="text-xs text-slate-300 truncate">
              {isLoaded ? email : "Session loading..."}
            </p>

            <p className="text-[10px] text-slate-500 mt-0.5">
              {isLoaded ? "Clerk session active" : "Awaiting auth"}
            </p>
          </div>

        </div>

      </div>

    </aside>
  );
}

export default Sidebar;