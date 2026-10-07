import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser geolocation access for the signed-in responder.
 *
 * The position is resolved AT MOST ONCE per browser session: the fix is
 * cached in sessionStorage and shared module-wide, so reloading the page
 * or navigating to the Command Center never triggers a second permission
 * prompt or safety re-check. The Permissions API keeps things quiet —
 * a "denied" state is remembered without prompting, and a "granted"
 * state allows a silent refresh of stale fixes.
 */

const FIX_KEY = "dg-geo-fix";
const DENIED_KEY = "dg-geo-denied";
const ATTEMPT_KEY = "dg-geo-attempted";
const FIX_TTL_MS = 30 * 60 * 1000; // silent refresh for fixes older than 30 min

let sharedFix = null; // survives SPA navigation and component remounts
let sharedAttempted = null;
let sharedInFlight = null;

function readSessionFix() {
  try {
    const raw = sessionStorage.getItem(FIX_KEY);
    if (!raw) return null;
    const fix = JSON.parse(raw);
    if (!fix || !Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) {
      return null;
    }
    return fix;
  } catch {
    return null;
  }
}

function cacheFix(fix) {
  sharedFix = fix;
  try {
    sessionStorage.setItem(FIX_KEY, JSON.stringify(fix));
  } catch {
    /* private mode: cache lives in memory for this page load only */
  }
}

function isDenied() {
  try {
    return sessionStorage.getItem(DENIED_KEY) === "1";
  } catch {
    return false;
  }
}

function markDenied() {
  try {
    sessionStorage.setItem(DENIED_KEY, "1");
  } catch {
    /* ignore */
  }
}

function wasAttempted() {
  if (sharedAttempted === null) {
    try {
      sharedAttempted = sessionStorage.getItem(ATTEMPT_KEY) === "1";
    } catch {
      sharedAttempted = false;
    }
  }
  return sharedAttempted;
}

function markAttempted() {
  sharedAttempted = true;
  try {
    sessionStorage.setItem(ATTEMPT_KEY, "1");
  } catch {
    /* module flag still guards this page load */
  }
}

/** Look up the permission state without ever showing a prompt. */
async function geolocationPermission() {
  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      return permission.state || "prompt";
    }
  } catch {
    /* Permissions API unavailable or unsupported */
  }
  return "prompt";
}

export function getPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        const messages = {
          1: "Location permission was denied",
          2: "Position unavailable right now",
          3: "Location request timed out",
        };
        reject(new Error(messages[error.code] || "Location lookup failed"));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000, ...options }
    );
  });
}

/**
 * Single session-level acquisition, shared by every consumer. Resolves
 * with { fix, error }: the cached fix when one exists, otherwise exactly
 * one browser request for the whole session. Concurrent hooks (Dashboard
 * + SafetyCheckModal mounting together) share the same in-flight call,
 * so only one permission prompt can ever appear.
 */
function ensureSessionFix() {
  if (sharedFix) return Promise.resolve({ fix: sharedFix, error: null });
  if (sharedInFlight) return sharedInFlight;

  sharedInFlight = (async () => {
    try {
      if (isDenied()) {
        return { fix: null, error: "Location permission was denied" };
      }

      const state = await geolocationPermission();
      if (state === "denied") {
        markDenied();
        return { fix: null, error: "Location permission was denied" };
      }

      // "granted" re-acquires silently; "prompt" shows the dialog once.
      const result = await getPosition();
      const fix = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
        timestamp: result.timestamp,
      };
      cacheFix(fix);
      try {
        sessionStorage.removeItem(DENIED_KEY);
      } catch {
        /* ignore */
      }
      return { fix, error: null };
    } catch (locationError) {
      if (locationError.message === "Location permission was denied") {
        markDenied();
      }
      return { fix: null, error: locationError.message };
    } finally {
      sharedInFlight = null;
    }
  })();

  return sharedInFlight;
}

/**
 * Resolves the user's position once per session and exposes manual
 * request attempts + errors for the UI (the safety briefing's retry
 * button). The permission dialog can only ever appear on the first
 * automatic attempt of a session.
 */
export function useGeolocation({ enabled = true } = {}) {
  const [position, setPosition] = useState(() => sharedFix || readSessionFix());
  const [status, setStatus] = useState(() =>
    sharedFix ? "located" : enabled ? "idle" : "disabled"
  );
  const [error, setError] = useState("");
  const requested = useRef(false);

  const request = useCallback(async () => {
    setStatus("locating");
    setError("");
    try {
      const result = await getPosition();
      const fix = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
        timestamp: result.timestamp,
      };
      cacheFix(fix);
      try {
        sessionStorage.removeItem(DENIED_KEY);
      } catch {
        /* ignore */
      }
      setPosition(fix);
      setStatus("located");
      return fix;
    } catch (locationError) {
      if (locationError.message === "Location permission was denied") {
        markDenied();
      }
      setError(locationError.message);
      setStatus("error");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || requested.current) return;
    requested.current = true;

    // All setState calls run inside an async task so React never sees a
    // synchronous update from the effect body.
    (async () => {
      // 1. Session cache — no prompt, no repeat check.
      if (sharedFix) {
        setPosition(sharedFix);
        setStatus("located");
        // Silent refresh for stale fixes; granted permission makes this
        // silent, so it never prompts.
        if (Date.now() - (sharedFix.timestamp || 0) > FIX_TTL_MS) {
          const state = await geolocationPermission();
          if (state === "granted") request();
        }
        return;
      }

      // 2. Attempted earlier this session (e.g. before a reload): honour
      //    the recorded outcome instead of asking again.
      if (wasAttempted()) {
        if (isDenied()) {
          setStatus("error");
          setError("Location permission was denied");
        }
        return;
      }

      markAttempted();

      const state = await geolocationPermission();
      if (state === "denied") {
        markDenied();
        setStatus("error");
        setError("Location permission was denied");
        return;
      }

      setStatus("locating");
      const { fix, error } = await ensureSessionFix();
      if (fix) {
        setPosition(fix);
        setStatus("located");
      } else {
        setStatus("error");
        setError(error || "Position unavailable right now");
      }
    })();
  }, [enabled, request]);

  return { position, status, error, request };
}

/** Haversine distance in km — mirrors the backend safety service. */
export function distanceKm(latA, lngA, latB, lngB) {
  const R = 6371.0088;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - latA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Relative time label for feeds ("12m ago"). */
export function timeAgo(isoOrDate) {
  if (!isoOrDate) return "";
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  return date.toLocaleDateString();
}
