"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchDriver, fetchLaps } from "@/services/api";
import type { Driver, Lap } from "@/types";
import StatCard from "@/components/cards/StatCard";
import LapTimeChart from "@/components/charts/LapTimeChart";
import SectorComparison from "@/components/charts/SectorComparison";
import { DRIVER_COLORS } from "@/types";

function fmtLap(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function DriverClient() {
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [race, setRace] = useState("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriver(code)
      .then(setDriver)
      .catch((e) => setError(e.message));
  }, [code]);

  useEffect(() => {
    setLoading(true);
    fetchLaps(year, race, code)
      .then((res) => setLaps(res.laps))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code, year, race]);

  const validLaps = laps.filter((l) => l.lap_time && l.lap_time > 0);
  const fastestLap = validLaps.length > 0 ? Math.min(...validLaps.map((l) => l.lap_time!)) : null;
  const avgLap = validLaps.length > 0 ? validLaps.reduce((a, b) => a + b.lap_time!, 0) / validLaps.length : null;
  const driverColor = DRIVER_COLORS[code] ?? "#E8002D";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[#8892a4] mb-1">
            <a href="/" className="hover:text-white">Home</a>
            <span className="mx-2">/</span>
            <span>Drivers</span>
            <span className="mx-2">/</span>
            <span>{code}</span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-2 h-12 rounded-full"
              style={{ background: driverColor }}
            />
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {driver?.name ?? code}
              </h1>
              <p className="text-[#8892a4]">
                {driver?.team ?? ""}{driver?.number ? ` · #${driver.number}` : ""}
                {driver?.nationality ? ` · ${driver.nationality}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="f1-select w-auto"
          >
            {[2020, 2021, 2022, 2023, 2024].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={24}
            value={race}
            onChange={(e) => setRace(e.target.value)}
            placeholder="Round"
            className="f1-input w-24"
          />
        </div>
      </div>

      {error && <div className="card p-4 text-[#FF1801] text-sm">⚠ {error}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Fastest Lap" value={fmtLap(fastestLap)} sub="this race" icon="⚡" color="red" />
        <StatCard label="Avg Lap Time" value={fmtLap(avgLap)} sub="valid laps" icon="⏱" color="blue" />
        <StatCard label="Total Laps" value={String(validLaps.length)} sub="valid" icon="🔄" color="green" />
        <StatCard label="Personal Bests" value={String(laps.filter((l) => l.is_personal_best).length)} sub="" icon="🥇" color="yellow" />
      </div>

      {/* Lap times chart */}
      <div className="card p-0 overflow-hidden">
        <div className="f1-stripe" />
        <div className="p-4">
          <h2 className="section-header mb-4">⏱ Lap Time Progression</h2>
          {loading ? (
            <div className="skeleton h-64 rounded" />
          ) : (
            <LapTimeChart year={year} race={race} drivers={[code]} />
          )}
        </div>
      </div>

      {/* Sector comparison */}
      <div className="card p-0 overflow-hidden">
        <div className="f1-stripe" />
        <div className="p-4">
          <h2 className="section-header mb-4">📊 Sector Analysis</h2>
          {loading ? (
            <div className="skeleton h-64 rounded" />
          ) : (
            <SectorComparison laps={validLaps} driverCode={code} />
          )}
        </div>
      </div>

      {/* Raw lap table */}
      <div className="card p-0 overflow-hidden">
        <div className="f1-stripe" />
        <div className="p-4">
          <h2 className="section-header mb-4">📋 Lap Data</h2>
          <div className="overflow-x-auto">
            <table className="f1-table">
              <thead>
                <tr>
                  <th>Lap</th>
                  <th>Time</th>
                  <th>S1</th>
                  <th>S2</th>
                  <th>S3</th>
                  <th>Tyre</th>
                  <th>Life</th>
                  <th>Stint</th>
                  <th>PB</th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lap, i) => (
                  <tr key={i} className={lap.is_personal_best ? "bg-purple-900/10" : ""}>
                    <td>{lap.lap_number}</td>
                    <td className="font-mono">{lap.lap_time_display ?? fmtLap(lap.lap_time)}</td>
                    <td className="font-mono text-xs">{lap.sector1?.toFixed(3) ?? "—"}</td>
                    <td className="font-mono text-xs">{lap.sector2?.toFixed(3) ?? "—"}</td>
                    <td className="font-mono text-xs">{lap.sector3?.toFixed(3) ?? "—"}</td>
                    <td>
                      <TyreBadge compound={lap.tyre_compound} />
                    </td>
                    <td className="text-xs">{lap.tyre_life ?? "—"}</td>
                    <td className="text-xs">{lap.stint ?? "—"}</td>
                    <td>{lap.is_personal_best ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TyreBadge({ compound }: { compound: string | null }) {
  const colors: Record<string, string> = {
    SOFT: "bg-red-900/40 text-red-300",
    MEDIUM: "bg-yellow-900/40 text-yellow-300",
    HARD: "bg-gray-700 text-gray-200",
    INTERMEDIATE: "bg-green-900/40 text-green-300",
    WET: "bg-blue-900/40 text-blue-300",
  };
  if (!compound) return <span className="text-[#8892a4]">—</span>;
  const cls = colors[compound.toUpperCase()] ?? "bg-gray-700 text-gray-300";
  return (
    <span className={`badge ${cls} text-xs`}>{compound.charAt(0)}</span>
  );
}
