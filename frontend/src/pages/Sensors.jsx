import { useCallback, useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import {
  Activity,
  Thermometer,
  Droplets,
  Gauge,
  Radio,
  Wifi,
  AlertTriangle,
  CloudRainWind,
  Wind,
  Waves,
  Globe2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet } from "../services/api";

const REFRESH_INTERVAL_MS = 60000;

const FEED_TONE = { live: "safe", degraded: "crit" };

function weatherCodeLabel(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Heavy showers",
    82: "Violent showers",
    95: "Thunderstorm",
    96: "Thunderstorm + hail",
    99: "Severe thunderstorm",
  };

  return map[code] || "Conditions unknown";
}

function timeAgo(epochMs) {
  if (!epochMs) {
    return "—";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - epochMs) / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function Sensors() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    try {
      const data = await apiGet(`/api/sensors/${refresh ? "?refresh=true" : ""}`);
      setSnapshot(data);
      setError("");
    } catch (fetchError) {
      console.error(fetchError);
      setError("Sensor feed unreachable — check the backend connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    apiGet("/api/sensors/")
      .then((data) => {
        if (!active) {
          return;
        }
        setSnapshot(data);
        setError("");
      })
      .catch((fetchError) => {
        console.error(fetchError);
        if (!active) {
          return;
        }
        setError("Sensor feed unreachable — check the backend connection.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    const timer = setInterval(() => load(true), REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load]);

  const sensors = snapshot?.sensors || [];
  const live = snapshot?.live || {};
  const earthquakes = live.earthquakes || [];
  const weather = live.weather || {};
  const riskLevel = snapshot?.live_risk_level ?? 0;

  const online = sensors.filter((sensor) => sensor.status === "Online").length;
  const alerts = sensors.filter(
    (sensor) => sensor.status === "Warning" || sensor.status === "Critical"
  ).length;

  const feedStatus = snapshot?.status || "unknown";

  return (
    <PageShell >
          {/* Heading */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">Telemetry</p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-[var(--color-ops-text)]">
                Sensor Network
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--color-ops-muted)]">
                Seismic + weather + deployed IoT nodes · PAN India
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={FEED_TONE[feedStatus] || "muted"}>{feedStatus.toUpperCase()}</Badge>

              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => load(true)}
                aria-busy={loading}
                disabled={loading}
              >
                <RefreshCw size={12} aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SensorStat
              icon={Radio}
              title="TOTAL SENSORS"
              value={loading ? "--" : sensors.length}
            />
            <SensorStat
              icon={Wifi}
              title="ONLINE NODES"
              value={loading ? "--" : online}
              tone="emerald"
            />
            <SensorStat
              icon={AlertTriangle}
              title="ACTIVE ALERTS"
              value={loading ? "--" : alerts}
              tone="amber"
            />
            <SensorStat
              icon={Activity}
              title="LIVE RISK LEVEL"
              value={loading ? "--" : riskLevel}
              suffix="/100"
              tone={riskLevel >= 60 ? "rose" : riskLevel >= 30 ? "amber" : "emerald"}
            />
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 mb-4 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Live external feeds */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Weather feed */}
            <section className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-ops-line)] flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                      LIVE WEATHER
                  </h2>
                  <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
                    Central India reference cell · 22.5937N, 78.9629E
                  </p>
                </div>

                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                  <CloudRainWind size={12} />
                  API LIVE
                </span>
              </div>

              <div className="p-4">
                {weather && Object.keys(weather).length > 0 ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-[var(--color-ops-muted)]">
                          CONDITIONS
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-ops-text)]">
                          {weatherCodeLabel(weather.weather_code)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-3xl font-bold text-[var(--color-ops-text)]">
                          {weather.temperature_2m != null
                            ? `${weather.temperature_2m.toFixed(1)}°`
                            : "--"}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--color-ops-muted)]">
                          TEMPERATURE
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <LiveMetric
                        icon={Droplets}
                        label="PRECIPITATION"
                        value={weather.precipitation != null ? `${weather.precipitation} mm` : "--"}
                      />
                      <LiveMetric
                        icon={CloudRainWind}
                        label="RAIN RATE"
                        value={weather.rain != null ? `${weather.rain} mm/h` : "--"}
                      />
                      <LiveMetric
                        icon={Wind}
                        label="WIND 10M"
                        value={weather.wind_speed_10m != null ? `${weather.wind_speed_10m} km/h` : "--"}
                      />
                      <LiveMetric
                        icon={Gauge}
                        label="GUSTS"
                        value={weather.wind_gusts_10m != null ? `${weather.wind_gusts_10m} km/h` : "--"}
                      />
                    </div>

                    <p className="mt-3 text-[10px] font-mono text-[var(--color-ops-muted)]">
                      UPDATED {timeAgo(snapshot?.updated_at * 1000)}
                      {" · "}
                      CACHE TTL {snapshot?.cache_ttl_seconds}s
                    </p>
                  </>
                ) : (
                  <div className="py-10 text-center text-xs text-[var(--color-ops-muted)]">
                    Weather feed unavailable.
                  </div>
                )}
              </div>
            </section>

            {/* Seismic feed */}
            <section className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-ops-line)] flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                      SEISMIC ACTIVITY
                  </h2>
                  <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
                    M2.5+ events within 3200km of reference cell
                  </p>
                </div>

                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                  <Globe2 size={12} />
                  API LIVE
                </span>
              </div>

              <div className="p-3 space-y-2 max-h-[280px] overflow-auto">
                {loading ? (
                  <div className="py-10 text-center text-xs text-[var(--color-ops-muted)]">
                    Loading seismic feed...
                  </div>
                ) : earthquakes.length === 0 ? (
                  <div className="py-10 text-center">
                    <Globe2 size={26} className="mx-auto text-[var(--color-ops-muted)]" />
                    <p className="mt-3 text-xs text-[var(--color-ops-secondary)]">
                      No M2.5+ seismic events detected in the region.
                    </p>
                  </div>
                ) : (
                  earthquakes.map((event) => (
                    <div
                      key={event.id || event.name}
                      className="flex items-center justify-between rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--color-ops-text)] truncate">
                          {event.name}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--color-ops-muted)] mt-0.5">
                          {event.latitude?.toFixed(2)}N,{" "}
                          {event.longitude?.toFixed(2)}E
                          {event.depth_km != null && ` · ${event.depth_km.toFixed(1)}km deep`}
                        </p>
                      </div>

                      <div className="text-right ml-3 shrink-0">
                        <p
                          className={`font-mono text-sm font-bold ${
                            event.magnitude >= 5
                              ? "text-rose-400"
                              : event.magnitude >= 4
                                ? "text-amber-400"
                                : "text-[var(--color-ops-text)]"
                          }`}
                        >
                          M{event.magnitude?.toFixed(1)}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--color-ops-muted)]">
                          {timeAgo(event.time)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Deployed sensor nodes */}
          <section className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-ops-line)] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold tracking-wider text-[var(--color-ops-text)]">
                  DEPLOYED SENSOR NODES · PAN INDIA
                </h2>
                <p className="text-[11px] text-[var(--color-ops-muted)] mt-0.5">
                  River gauges, rainfall nodes and landslide radars
                </p>
              </div>

              <span className="text-[10px] font-mono text-[var(--color-ops-muted)]">
                {sensors.length} NODES
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sensors.map((sensor) => (
                <SensorCard key={sensor.id} sensor={sensor} />
              ))}
            </div>
          </section>

          {/* Auto-refresh note */}
          <p className="mt-3 text-center text-[10px] font-mono text-[var(--color-ops-muted)]">
              AUTO-REFRESH EVERY 60S · LIVE FEEDS: SEISMIC + WEATHER
          </p>
    </PageShell>
  );
}

function SensorStat({ icon: Icon, title, value, suffix, tone }) {
  const valueColor =
    tone === "rose"
      ? "text-rose-400"
      : tone === "amber"
        ? "text-amber-400"
        : tone === "emerald"
          ? "text-emerald-400"
          : "text-[var(--color-ops-text)]";

  return (
    <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-wider text-[var(--color-ops-muted)]">
          {title}
        </p>
        <Icon size={14} className="text-[var(--color-ops-muted)]" />
      </div>

<p className={`font-mono text-3xl font-semibold mt-2 ${valueColor}`}>
        {value}
        {suffix && <span className="text-sm text-[var(--color-ops-muted)]">{suffix}</span>}
      </p>
    </div>
  );
}

function LiveMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-[var(--color-ops-line)] bg-[var(--color-ops-raised)] p-3">
      <div className="flex items-center gap-1.5 text-[var(--color-ops-muted)]">
        <Icon size={13} />
        <span className="text-[9px] font-bold tracking-wider">{label}</span>
      </div>

      <p className="mt-1.5 font-mono text-sm font-bold text-[var(--color-ops-text)]">
        {value}
      </p>
    </div>
  );
}

function SensorCard({ sensor }) {
  const isAlert =
    sensor.status === "Warning" || sensor.status === "Critical";

  return (
    <div
      className={`rounded-md border p-4 ${
        isAlert
          ? "border-amber-500/30 bg-[var(--color-ops-raised)]"
          : "border-[var(--color-ops-line)] bg-[var(--color-ops-raised)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-2 text-[var(--color-ops-secondary)]">
            <Waves size={16} />
          </div>

          <div>
            <h3 className="text-xs font-bold text-[var(--color-ops-text)]">
              {sensor.name}
            </h3>
            <p className="text-[10px] font-mono text-[var(--color-ops-muted)] mt-0.5">
              {sensor.location}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isAlert ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
          <span
            className={`text-[10px] font-bold tracking-wide ${
              isAlert ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {sensor.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <NodeMetric icon={Droplets} label="WATER LEVEL" value={`${sensor.water_level} m`} />
        <NodeMetric icon={Gauge} label="PRESSURE" value={`${sensor.pressure} hPa`} />
        <NodeMetric icon={Thermometer} label="TEMPERATURE" value={`${sensor.temperature} °C`} />
        <NodeMetric
          icon={Activity}
          label="ALERT LEVEL"
          value={`${sensor.alert_level}/100`}
          tone={sensor.alert_level >= 70 ? "rose" : sensor.alert_level >= 50 ? "amber" : "default"}
        />
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-[var(--color-ops-panel)]">
        <div
          className={`h-full rounded-sm ${
            sensor.alert_level >= 70
              ? "bg-rose-500"
              : sensor.alert_level >= 50
                ? "bg-amber-500"
                : "bg-emerald-500"
          }`}
          style={{ width: `${sensor.alert_level}%` }}
        />
      </div>

      {isAlert && (
        <div className="mt-3 flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-400">
          <AlertTriangle size={12} />
          ABNORMAL READING — CORROBORATION ACTIVE
        </div>
      )}
    </div>
  );
}

function NodeMetric({ icon: Icon, label, value, tone }) {
  const valueColor =
    tone === "rose"
      ? "text-rose-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-[var(--color-ops-text)]";

  return (
    <div className="rounded border border-[var(--color-ops-line)] bg-[var(--color-ops-panel)] p-2.5">
      <div className="flex items-center gap-1.5 text-[var(--color-ops-muted)]">
        <Icon size={11} />
        <span className="text-[9px] font-bold tracking-wider">{label}</span>
      </div>

      <p className={`mt-1 font-mono text-xs font-bold ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

export default Sensors;
