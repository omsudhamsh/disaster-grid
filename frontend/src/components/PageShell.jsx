import { useState } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLocation } from "react-router-dom";

import { Dialog, DialogDrawer, DialogTitle } from "@/components/ui/dialog";
import TopNav from "./TopNav";
import { SidebarBody } from "./Sidebar";
import Footer from "./Footer";

/**
 * Shared application shell: a horizontal glassmorphism Operations bar on
 * top, with the full remaining viewport below it — the map is the hero and
 * every page gets the entire width. The page content scrolls underneath
 * the blurred bar so the glass treatment stays live while navigating.
 *
 * On small screens the operations links collapse into a Radix-backed
 * slide-over so navigation and the project-info dialogs remain reachable
 * without sacrificing the desktop layout. Navigating closes the drawer via
 * the sidebar's `onNavigate` callback.
 *
 * Extra props (e.g. safetyVerdict / onOpenSafety on the Dashboard) are
 * forwarded to the TopNav. Routes are keyed so every page transition gets
 * a soft rise-and-fade entrance.
 */
export default function PageShell({ children, ...navProps }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--color-ops-bg)]">
      <TopNav onOpenNav={() => setNavOpen(true)} {...navProps} />

      {/* Mobile navigation drawer */}
      <Dialog open={navOpen} onOpenChange={setNavOpen}>
        <DialogDrawer aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>Navigation</DialogTitle>
          </VisuallyHidden>
          <SidebarBody onNavigate={() => setNavOpen(false)} />
        </DialogDrawer>
      </Dialog>

      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <PageTransition>
          <div className="mx-auto flex min-h-full w-full max-w-[1800px] flex-col px-4 py-5 sm:px-6">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </PageTransition>
      </main>
    </div>
  );
}

/**
 * Route-keyed entrance transition. `key` remounts the wrapper on every
 * navigation, replaying a soft rise-and-fade (disabled under
 * prefers-reduced-motion by the global CSS rule).
 */
function PageTransition({ children }) {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="reveal">
      {children}
    </div>
  );
}
