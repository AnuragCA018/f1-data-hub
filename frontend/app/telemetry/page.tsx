"use client";

import { useState } from "react";
import { fetchCompareTelemetry } from "@/services/api";
import type { CompareTelemetryResponse } from "@/types";
import { DRIVER_COLORS } from "@/types";
import SpeedTrace from "@/components/charts/SpeedTrace";
import ThrottleBrake from "@/components/charts/ThrottleBrake";
import GearTrace from "@/components/charts/GearTrace";
import StatCard from "@/components/cards/StatCard";

const CURRENT_YEAR = 2024;

/** Shared control input styling */
const inputCls = "f1-input";
const selectCls = "f1-select";

export default function TelemetryPage() {
  const [year, setYear]           = useState(CURRENT_YEAR);
  const [race, setRace]           = useState("1");
  const [driver1, setDriver1]     = useState("VER");
  const [driver2, setDriver2]     = useState("HAM");
  const [lap1, setLap1]           = useState(1);
  const [lap2, setLap2]           = useState(1);
  const [sessionType, setSession] = useState("R");

  const [data, setData]       = useState<CompareTelemetryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchCompareTelemetry(year, race, driver1, driver2, lap1, lap2, sessionType)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  const color1 = DRIVER_COLORS[driver1.toUpperCase()] ?? "#FF1801";
  const color2 = DRIVER_COLORS[driver2.toUpperCase()] ?? "#1F8BFF";

  const maxSpeed1 = data ? Math.max(...data.driver1.points.map((p) => p.speed ?? 0)) : null;
  const maxSpeed2 = data ? Math.max(...data.driver2.points.map((p) => p.speed ?? 0)) : null;
  const avgThrottle1 = data && data.driver1.points.length
    ? data.driver1.points.reduce((s, p) => s + (p.throttle ?? 0), 0) / data.driver1.points.length
    : null;
  const avgThrottle2 = data && data.driver2.points.length
    ? data.driver2.points.reduce((s, p) => s + (p.throttle ?? 0), 0) / data.driver2.points.length
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Telemetry Comparison</h1>
        <p className="page-subtitle">Speed · Throttle · Brake · Gear overlay for two drivers</p>
      </div>

      {/* Controls Card */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#141821", border: "1px solid #1E2535" }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <label className="data-label block mb-1.5">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
              {[2020,2021,2022,2023,2024,2025,2026].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="data-label block mb-1.5">Round</label>
            <input type="number" min={1} max={24} value={race}
              onChange={(e) => setRace(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="data-label block mb-1.5">Session</label>
            <select value={sessionType} onChange={(e) => setSession(e.target.value)} className={selectCls}>
              {["R","Q","FP1","FP2","FP3"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="data-label block mb-1.5" style={{ color: color1 }}>Driver 1</label>
            <input value={driver1} onChange={(e) => setDriver1(e.target.value.toUpperCase())}
              maxLength={3} className={`${inputCls} font-mono uppercase font-bold`}
              style={{ borderColor: color1 + "60" }} />
          </div>
          <div>
            <label className="data-label block mb-1.5" style={{ color: color1 }}>Lap 1</label>
            <input type="number" min={1} value={lap1}
              onChange={(e) => setLap1(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="data-label block mb-1.5" style={{ color: color2 }}>Driver 2</label>
            <input value={driver2} onChange={(e) => setDriver2(e.target.value.toUpperCase())}
              maxLength={3} className={`${inputCls} font-mono uppercase font-bold`}
              style={{ borderColor: color2 + "60" }} />
          </div>
          <div>
            <label className="data-label block mb-1.5" style={{ color: color2 }}>Lap 2</label>
            <input type="number" min={1} value={lap2}
              onChange={(e) => setLap2(Number(e.target.value))} className={inputCls} />
          </div>
        </div>

        {/* Driver color indicators */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold"
            style={{ color: color1 }}>
            <span className="w-3 h-3 rounded-full" style={{ background: color1, boxShadow: `0 0 6px ${color1}` }} />
            {driver1}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold"
            style={{ color: color2 }}>
            <span className="w-3 h-3 rounded-full" style={{ background: color2, boxShadow: `0 0 6px ${color2}` }} />
            {driver2}
          </div>
          <div className="flex-1" />
          <button onClick={load} disabled={loading} className="btn-primary disabled:opacity-50">
            {loading ? "Loading…" : "Load & Compare"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 text-sm flex items-start gap-3"
          style={{ background: "#FF180110", border: "1px solid #FF180130" }}>
          <span className="text-[#FF1801] text-base mt-0.5">⚠</span>
          <div>
            <p className="text-[#FF1801] font-semibold">Error</p>
            <p className="text-[#9CA3AF] mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-fade-in">
          <div
            className="rounded-xl p-4 text-sm flex items-center gap-3"
            style={{ background: "#1F8BFF0A", border: "1px solid #1F8BFF25" }}
          >
            <div className="w-2 h-2 rounded-full bg-[#1F8BFF] animate-pulse" />
            <div>
              <p className="text-[#1F8BFF] font-semibold">Fetching Telemetry</p>
              <p className="text-[#6B7280] text-xs mt-0.5">
                Older seasons may take 2–5 minutes while FastF1 downloads session data.
              </p>
            </div>
          </div>
          <div className="skeleton h-72 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-56 rounded-xl" />
            <div className="skeleton h-56 rounded-xl" />
          </div>
          <div className="skeleton h-52 rounded-xl" />
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-5 animate-slide-up">
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={`${driver1} Max Speed`} value={maxSpeed1 ? `${maxSpeed1.toFixed(0)} km/h` : "—"} sub="this lap" icon="⚡" color="red" />
            <StatCard label={`${driver2} Max Speed`} value={maxSpeed2 ? `${maxSpeed2.toFixed(0)} km/h` : "—"} sub="this lap" icon="⚡" color="blue" />
            <StatCard label={`${driver1} Avg Throttle`} value={avgThrottle1 ? `${avgThrottle1.toFixed(1)}%` : "—"} sub="full lap" icon="🦶" color="green" />
            <StatCard label={`${driver2} Avg Throttle`} value={avgThrottle2 ? `${avgThrottle2.toFixed(1)}%` : "—"} sub="full lap" icon="🦶" color="yellow" />
          </div>

          {/* Speed trace */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2535", background: "#141821" }}>
            <div className="f1-stripe" />
            <div className="p-4">
              <h2 className="section-header mb-4">
                <span style={{ color: "#FF1801" }}>◈</span> Speed Trace
              </h2>
              <SpeedTrace
                driver1={{ code: driver1, points: data.driver1.points, color: color1 }}
                driver2={{ code: driver2, points: data.driver2.points, color: color2 }}
              />
            </div>
          </div>

          {/* Throttle / Brake */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(["throttle", "brake"] as const).map((ch) => (
              <div key={ch} className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2535", background: "#141821" }}>
                <div className={ch === "throttle" ? "f1-stripe-blue" : "f1-stripe"} />
                <div className="p-4">
                  <h2 className="section-header mb-3">
                    {ch === "throttle" ? "🦶 Throttle" : "🛑 Brake"}
                  </h2>
                  <ThrottleBrake
                    driver1={{ code: driver1, points: data.driver1.points, color: color1 }}
                    driver2={{ code: driver2, points: data.driver2.points, color: color2 }}
                    channel={ch}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Gear + RPM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2535", background: "#141821" }}>
              <div className="f1-stripe" />
              <div className="p-4">
                <h2 className="section-header mb-3">⚙ Gear Trace</h2>
                <GearTrace
                  driver1={{ code: driver1, points: data.driver1.points, color: color1 }}
                  driver2={{ code: driver2, points: data.driver2.points, color: color2 }}
                  channel="gear"
                />
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2535", background: "#141821" }}>
              <div className="f1-stripe-blue" />
              <div className="p-4">
                <h2 className="section-header mb-3">🔄 RPM</h2>
                <GearTrace
                  driver1={{ code: driver1, points: data.driver1.points, color: color1 }}
                  driver2={{ code: driver2, points: data.driver2.points, color: color2 }}
                  channel="rpm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
