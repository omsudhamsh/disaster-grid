import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignInButton, SignUpButton, useAuth } from '@clerk/react';
import { ShieldCheck, Radio } from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import CrisisIntelligence from "./pages/CrisisIntelligence";
import Imagery from "./pages/Imagery";
import Sensors from "./pages/Sensors";
import Resources from "./pages/Resources";
import Fusion from "./pages/Fusion";

function AuthGate() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800">
            <ShieldCheck size={28} className="text-emerald-400" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-white">
            Disaster Grid
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Emergency intelligence operations are restricted to authorized
            responders. Sign in to access the command center, report live
            incidents and run imagery analysis.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Radio size={14} className="text-emerald-500" />
            Live monitoring active across South India
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <SignUpButton mode="modal">
              <button className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500">
                Create responder account
              </button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
                Sign in to existing account
              </button>
            </SignInButton>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          B.Tech Major Project · Multimodal Disaster Response Platform
        </p>
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />
          <p className="mt-4 text-sm text-slate-500">
            Loading session...
          </p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <AuthGate />;
  }

  return children;
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RequireAuth>
    </BrowserRouter>
  );
}

export default App;
