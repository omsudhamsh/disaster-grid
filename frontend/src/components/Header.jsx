 import { Bell, Radio } from "lucide-react";

function Header() {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">

      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Command Center
        </h2>

        <p className="text-xs text-slate-500 mt-0.5">
          Real-time disaster response overview
        </p>
      </div>

      <div className="flex items-center gap-6">

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Radio size={15} className="text-emerald-600" />

          <span>Live monitoring</span>

          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>

        <button className="relative text-slate-500 hover:text-slate-800">
          <Bell size={19} />

          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold">
          DG
        </div>

      </div>

    </header>
  );
}

export default Header;