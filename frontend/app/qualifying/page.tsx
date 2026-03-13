"use client";

import { useState } from "react";
import { fetchLaps } from "@/services/api";
import type { Lap } from "@/types";
import SectorComparison from "@/components/charts/SectorComparison";
import { DRIVER_COLORS } from "@/types";

const CURRENT_YEAR = 2024;

function fmtTime(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

export default function QualifyingPage() {
  const [year, setYear]         = useState(CURRENT_YEAR);
  const [race, setRace]         = useState("1");
  const [drivers, setDrivers]   = useState("VER,HAM,LEC");
  const [driverLaps, setDriverLaps] = useState<Record<string, Lap[]>>({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    const driverList = drivers.split(",").map((d) => d.trim().toUpperCase()).filter(Boolean);

    (async () => {
      const map: Record<string, Lap[]> = {};
      for (const d of driverList) {
        const res = await fetchLaps(year, race, d, "Q");
        map[d] = res.laps;
      }
      setDriverLaps(map);
    })()
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  const driverList = Object.keys(driverLaps);

  // Fastest lap per driver
  const fastestLaps = driverList
    .map((d) => {
      const best = driverLaps[d]
        .filter((l) => l.lap_time)
        .sort((a, b) => (a.lap_time ?? Infinity) - (b.lap_time ?? Infinity))[0];
      return { driver: d, lap: best ?? null };
    })
    .filter((x) => x.lap !== null)
    .sort((a, b) => (a.lap!.lap_time ?? Infinity) - (b.lap!.lap_time ?? Infinity));

  const poleTime = fastestLaps[0]?.lap?.lap_time ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Qualifying Analysis</h1>
        <p className="page-subtitle">Sector breakdown, fastest lap delta and comparative analysis</p>
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="data-label block mb-1.5">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="f1-select">
              {[2020,2021,2022,2023,2024,2025,2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="data-label block mb-1.5">Round</label>
            <input type="number" min={1} max={24} value={race} onChange={(e) => setRace(e.target.value)} className="f1-input" />
          </div>
          <div>
            <label className="data-label block mb-1.5">Drivers (comma-separated)</label>
            <input value={drivers} onChange={(e) => setDrivers(e.target.value)}
              placeholder="VER,HAM,LEC,NOR"
              className="f1-input font-mono uppercase" />
          </div>
        </div>
        <button onClick={load} disabled={loading} className="mt-4 btn-primary disabled:opacity-50">
          {loading ? "Loading…" : "Load Qualifying"}
        </button>
      </div>

      {error && <div className="card p-4 text-[#FF1801] text-sm">⚠ {error}</div>}
      {loading && <div className="skeleton h-64 rounded-xl" />}

      {fastestLaps.length > 0 && (
        <>
          {/* Fastest lap table */}
          <div className="card p-0 overflow-hidden">
            <div className="f1-stripe" />
            <div className="p-4">
              <h2 className="section-header mb-4">⏱ Qualifying Times</h2>
              <div className="overflow-x-auto">
                <table className="f1-table">
                  <thead>
                    <tr>
                      <th>Pos</th><th>Driver</th><th>Time</th>
                      <th>Delta</th><th>S1</th><th>S2</th><th>S3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fastestLaps.map(({ driver, lap }, i) => {
                      const delta = lap && poleTime ? lap.lap_time! - poleTime : null;
                      const color = DRIVER_COLORS[driver] ?? "#8892a4";
                      return (
                        <tr key={driver}>
                          <td className="font-bold">{i + 1}</td>
                          <td>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                              <span className="font-mono font-semibold">{driver}</span>
                            </span>
                          </td>
                          <td className="font-mono text-green-400">{fmtTime(lap!.lap_time)}</td>
                          <td className="font-mono text-yellow-300">
                            {i === 0 ? "—" : delta ? `+${delta.toFixed(3)}` : "—"}
                          </td>
                          <td className="font-mono text-xs">{lap!.sector1?.toFixed(3) ?? "—"}</td>
                          <td className="font-mono text-xs">{lap!.sector2?.toFixed(3) ?? "—"}</td>
                          <td className="font-mono text-xs">{lap!.sector3?.toFixed(3) ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sector comparison for first two drivers */}
          {fastestLaps.length >= 2 && (
            <div className="card p-0 overflow-hidden">
              <div className="f1-stripe" />
              <div className="p-4">
                <h2 className="section-header mb-4">📊 Sector Comparison</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {fastestLaps.slice(0, 4).map(({ driver, lap }) => (
                    <SectorComparison
                      key={driver}
                      laps={driverLaps[driver] ?? []}
                      driverCode={driver}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
