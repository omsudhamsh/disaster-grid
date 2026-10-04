import { useEffect, useState } from "react";
import {
  Activity,
  Thermometer,
  Droplets,
  Gauge,
  Radio,
  Wifi,
  AlertTriangle,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

function Sensors() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/sensors/")
      .then((response) => response.json())
      .then((data) => {
        setSensors(data.sensors || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const online = sensors.filter(
    (sensor) => sensor.status === "Online"
  ).length;

  const alerts = sensors.filter(
    (sensor) =>
      sensor.status === "Warning" ||
      sensor.status === "Critical"
  ).length;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <div className="flex-1">
        <Header />

        <main className="p-6">

          {/* Heading */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <Radio size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Sensor Network
                </h1>

                <p className="text-sm text-slate-500">
                  Real-time environmental and infrastructure monitoring
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

            <StatCard
              icon={<Radio size={20} />}
              title="Total Sensors"
              value={sensors.length}
            />

            <StatCard
              icon={<Wifi size={20} />}
              title="Online Sensors"
              value={online}
            />

            <StatCard
              icon={<AlertTriangle size={20} />}
              title="Active Alerts"
              value={alerts}
            />

          </div>

          {/* Sensor grid */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Live Sensor Feed
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Incoming readings from deployed monitoring devices
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Loading sensor network...
              </div>
            ) : sensors.length === 0 ? (
              <div className="py-16 text-center">
                <Radio
                  size={40}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-medium text-slate-500">
                  No sensor data available
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sensors.map((sensor) => (
                  <SensorCard
                    key={sensor.id}
                    sensor={sensor}
                  />
                ))}
              </div>
            )}
          </section>

          {/* System explanation */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-slate-100 p-3">
                <Activity
                  size={22}
                  className="text-slate-700"
                />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Sensor Intelligence
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Sensor observations provide continuous ground-level
                  information about environmental and infrastructure
                  conditions. These readings can be combined with
                  incident reports and imagery analysis to improve
                  situational awareness and response prioritization.
                </p>
              </div>
            </div>

          </section>

        </main>
      </div>
    </div>
  );
}

function SensorCard({ sensor }) {
  const isAlert =
    sensor.status === "Warning" ||
    sensor.status === "Critical";

  return (
    <div
      className={`rounded-xl border p-5 ${
        isAlert
          ? "border-slate-300 bg-slate-50"
          : "border-slate-200 bg-white"
      }`}
    >

      <div className="flex items-start justify-between">

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
            <Activity size={18} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {sensor.name}
            </h3>

            <p className="text-xs text-slate-500">
              {sensor.location}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isAlert
                ? "bg-orange-500"
                : "bg-green-500"
            }`}
          />

          <span className="text-xs font-medium text-slate-500">
            {sensor.status}
          </span>
        </div>

      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">

        <Reading
          icon={<Droplets size={16} />}
          label="Water Level"
          value={`${sensor.water_level} m`}
        />

        <Reading
          icon={<Gauge size={16} />}
          label="Pressure"
          value={`${sensor.pressure} kPa`}
        />

        <Reading
          icon={<Thermometer size={16} />}
          label="Temperature"
          value={`${sensor.temperature} °C`}
        />

        <Reading
          icon={<Activity size={16} />}
          label="Signal"
          value={`${sensor.signal}%`}
        />

      </div>

      {isAlert && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-white p-3 text-xs font-medium text-slate-700">
          <AlertTriangle size={15} />
          Abnormal sensor reading detected
        </div>
      )}

    </div>
  );
}

function Reading({ icon, label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">

      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}

        <span className="text-[11px]">
          {label}
        </span>
      </div>

      <div className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </div>

    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center gap-3">

        <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
          {icon}
        </div>

        <span className="text-sm text-slate-500">
          {title}
        </span>

      </div>

      <div className="mt-4 text-3xl font-bold text-slate-900">
        {value}
      </div>

    </div>
  );
}

export default Sensors;