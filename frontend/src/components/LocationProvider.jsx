import { useGeolocation } from "../services/geolocation";
import { LocationContext } from "../services/locationContext";

/*
 * App-level location provider.
 *
 * Mounted as soon as the responder is signed in (inside RequireAuth), so
 * the browser permission prompt appears once — right after login — and
 * NOT when the user later clicks "Command Center" or navigates between
 * pages. `useGeolocation` caches the fix for the whole session, and the
 * context makes the resolved position (or a denied/timeout state)
 * available to every page without a second browser prompt.
 */
export default function LocationProvider({ children }) {
  const geolocation = useGeolocation({ enabled: true });
  return (
    <LocationContext.Provider value={geolocation}>{children}</LocationContext.Provider>
  );
}
