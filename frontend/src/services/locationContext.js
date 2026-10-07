import { createContext, useContext } from "react";

/*
 * Shared responder-location context (context object + hook only — the
 * provider component lives in components/LocationProvider.jsx so fast
 * refresh stays happy).
 */

export const LocationContext = createContext(null);

/**
 * Access the shared responder position + request state.
 * Returns { position, status, error, request } or null if no provider
 * is mounted (e.g. signed-out screens).
 */
export function useLocationContext() {
  return useContext(LocationContext);
}
