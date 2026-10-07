import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignInButton, SignUpButton, useAuth } from "@clerk/react";
import { Globe2, GraduationCap, Rss, Satellite, ShieldCheck, ShieldQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";
import LocationProvider from "./components/LocationProvider";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import CrisisIntelligence from "./pages/CrisisIntelligence";
import Imagery from "./pages/Imagery";
import Sensors from "./pages/Sensors";
import Resources from "./pages/Resources";
import Fusion from "./pages/Fusion";
import Attributions from "./pages/Attributions";
import { PrivacyPolicyModal, TeamDetailsModal } from "./components/ProjectInfoModals";

/**
 * Signed-out screen. This is the only place sign-in / sign-up entry points
 * live, so the rest of the console never renders an unreachable duplicate.
 */
function AuthGate() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-ops-bg)] p-6">
      <div className="w-full max-w-md">
        <div className="glass-pop rounded-2xl border border-[var(--color-ops-line-strong)] p-8 text-center shadow-2xl">
          <span className="mx-auto flex size-14 items-center justify-center rounded-xl border border-[var(--color-ops-line-strong)] bg-[var(--color-ops-raised)]">
            <ShieldCheck size={27} className="text-[var(--color-ops-accent)]" aria-hidden="true" />
          </span>

          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-[var(--color-ops-text)]">
            Disaster Grid
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--color-ops-secondary)]">
            Emergency intelligence operations are restricted to authorized responders. Sign in to
            access the command center, report live incidents and run satellite imagery analysis.
          </p>

          <div className="mx-auto mt-5 grid grid-cols-3 gap-2 text-left">
            <AuthCapability icon={Satellite} label="Live satellite feeds" />
            <AuthCapability icon={Rss} label="Bot-screened social intel" />
            <AuthCapability icon={Globe2} label="10 km location safety" />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <SignUpButton mode="modal">
              <Button type="button" variant="default" block>
                Create responder account
              </Button>
            </SignUpButton>

            <SignInButton mode="modal">
              <Button type="button" variant="neutral" block>
                Sign in to existing account
              </Button>
            </SignInButton>
          </div>
        </div>

        {/* Privacy Policy + Team Details */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPrivacyOpen(true)}
            className="min-w-0 px-2 text-[11px] font-semibold tracking-wide"
          >
            <ShieldQuestion size={13} aria-hidden="true" />
            <span className="min-w-0 truncate">Privacy Policy</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTeamOpen(true)}
            className="min-w-0 px-2 text-[11px] font-semibold tracking-wide"
          >
            <GraduationCap size={13} aria-hidden="true" />
            <span className="min-w-0 truncate">Team Details</span>
          </Button>
        </div>

        <p className="mt-4 text-center font-mono text-[10px] tracking-wide text-[var(--color-ops-muted)]">
          MULTIMODAL DISASTER RESPONSE PLATFORM
        </p>
      </div>

      <PrivacyPolicyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <TeamDetailsModal open={teamOpen} onClose={() => setTeamOpen(false)} />
    </div>
  );
}

function AuthCapability({ icon: Icon, label }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-2.5 py-3">
      <Icon size={15} className="text-[var(--color-ops-accent)]" aria-hidden="true" />
      <p className="mt-2 text-[10px] leading-snug text-[var(--color-ops-secondary)]">{label}</p>
    </div>
  );
}

function RequireAuth({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-ops-bg)]">
        <div className="text-center">
          <div
            role="status"
            aria-label="Loading session"
            className="mx-auto h-10 w-10 spinner rounded-full border-4 border-[var(--color-ops-line)] border-t-[var(--color-ops-accent)]"
          />
          <p className="mt-4 text-sm text-[var(--color-ops-muted)]">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <AuthGate />;
  }

  // Geolocation is requested here, immediately after login, so the
  // browser permission prompt appears once and the fix is shared across
  // the whole session (never re-prompted on navigation).
  return <LocationProvider>{children}</LocationProvider>;
}

function App() {
  return (
    <BrowserRouter>
      <RequireAuth>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/crisis" element={<CrisisIntelligence />} />
          <Route path="/imagery" element={<Imagery />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/fusion" element={<Fusion />} />
          <Route path="/attribution" element={<Attributions />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RequireAuth>
    </BrowserRouter>
  );
}

export default App;