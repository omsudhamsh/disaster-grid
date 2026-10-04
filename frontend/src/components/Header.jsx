import { Bell, Radio } from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/react";

function Header() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : (user?.emailAddresses?.[0]?.emailPrefix || "Responder");

  return (
    <header className="h-16 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between px-6 shrink-0">

      <div>
        <h2 className="text-sm font-semibold text-slate-100 tracking-wide">
          COMMAND CENTER
        </h2>

        <p className="text-[11px] text-slate-500 mt-0.5">
          Real-time disaster response overview · South India
        </p>
      </div>

      <div className="flex items-center gap-6">

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Radio size={15} className="text-emerald-500" />

          <span>LIVE</span>

          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>

        <button className="relative text-slate-400 hover:text-slate-200 transition-colors">
          <Bell size={17} />

          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        {!isSignedIn && (
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button className="rounded-md px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-900 hover:bg-white transition-colors">
                Sign up
              </button>
            </SignUpButton>
          </div>
        )}

        {isSignedIn && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-100">
                {displayName}
              </p>
              <p className="text-[10px] text-emerald-500">
                Authorized responder
              </p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        )}

      </div>

    </header>
  );
}

export default Header;
