"use client";

import { useState } from "react";
import { fetchTrackPosition } from "@/services/api";
import type { TrackPositionResponse } from "@/types";
import { DRIVER_COLORS } from "@/types";
import TrackMap from "@/components/charts/TrackMap";

const CURRENT_YEAR = 2024;

export default function TrackPage() {
  const [year, setYear]       = useState(CURRENT_YEAR);
  const [race, setRace]       = useState("1");
  const [driver1, setDriver1] = useState("VER");
  const [driver2, setDriver2] = useState("HAM");
  const [lap1, setLap1]       = useState<number | "">("");
  const [lap2, setLap2]       = useState<number | "">("");
  const [sessionType, setSessionType] = useState("Q");

  const [track1, setTrack1] = useState<TrackPositionResponse | null>(null);
  const [track2, setTrack2] = useState<TrackPositionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    setTrack1(null);
    setTrack2(null);

    const lap1Param  = lap1  !== "" ? Number(lap1)  : undefined;
    const lap2Param  = lap2  !== "" ? Number(lap2)  : undefined;

    const url1 = `/api/telemetry/track/${year}/${race}/${driver1}?session_type=${sessionType}${lap1Param !== undefined ? `&lap=${lap1Param}` : ""}`;
    const url2 = `/api/telemetry/track/${year}/${race}/${driver2}?session_type=${sessionType}${lap2Param !== undefined ? `&lap=${lap2Param}` : ""}`;
    console.log("[TrackMap] Requesting driver1:", url1);
    console.log("[TrackMap] Requesting driver2:", url2);

    Promise.all([
      fetchTrackPosition(year, race, driver1, lap1Param, sessionType),
      fetchTrackPosition(year, race, driver2, lap2Param, sessionType),
    ])
      .then(([res1, res2]) => {
        console.log("[TrackMap] driver1 response – points:", res1.x.length, "x sample:", res1.x[0], "y sample:", res1.y[0]);
        console.log("[TrackMap] driver2 response – points:", res2.x.length, "x sample:", res2.x[0], "y sample:", res2.y[0]);
        setTrack1(res1);
        setTrack2(res2);
      })
      .catch((e) => {
        console.error("[TrackMap] API error:", e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }

  const color1 = DRIVER_COLORS[driver1.toUpperCase()] ?? "#E8002D";
  const color2 = DRIVER_COLORS[driver2.toUpperCase()] ?? "#27F4D2";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Track Map</h1>
        <p className="page-subtitle">Racing line visualisation using GPS telemetry position data</p>
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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
            <label className="data-label block mb-1.5">Session</label>
            <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="f1-select">
              {["Q","R","FP1","FP2","FP3"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="data-label block mb-1.5" style={{ color: color1 }}>Driver 1</label>
            <input value={driver1} onChange={(e) => setDriver1(e.target.value.toUpperCase())} maxLength={3}
              className="f1-input font-mono uppercase" style={{ borderColor: color1 + "60" }} />
          </div>
          <div>
            <label className="data-label block mb-1.5" style={{ color: color1 }}>Lap 1 <span className="text-[#9CA3AF]">(blank=fastest)</span></label>
            <input type="number" min={1} value={lap1} onChange={(e) => setLap1(e.target.value === "" ? "" : Number(e.target.value))} className="f1-input" placeholder="fastest" />
          </div>
          <div>
            <label className="data-label block mb-1.5" style={{ color: color2 }}>Driver 2</label>
            <input value={driver2} onChange={(e) => setDriver2(e.target.value.toUpperCase())} maxLength={3}
              className="f1-input font-mono uppercase" style={{ borderColor: color2 + "60" }} />
          </div>
          <div>
            <label className="data-label block mb-1.5" style={{ color: color2 }}>Lap 2 <span className="text-[#9CA3AF]">(blank=fastest)</span></label>
            <input type="number" min={1} value={lap2} onChange={(e) => setLap2(e.target.value === "" ? "" : Number(e.target.value))} className="f1-input" placeholder="fastest" />
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="mt-4 btn-primary disabled:opacity-50">
          {loading ? "Loading…" : "Render Track Map"}
        </button>
      </div>

      {error && <div className="card p-4 text-[#FF1801] text-sm">⚠ {error}</div>}

      {loading && <div className="skeleton h-[500px] rounded-xl" />}

      {!loading && track1 && track2 && (
        <div className="card p-0 overflow-hidden">
          <div className="f1-stripe" />
          <div className="p-4">
            <div className="flex items-center gap-6 mb-4">
              <h2 className="section-header">🗺 Track Map</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-1 rounded" style={{ background: color1 }} />
                  <span className="font-mono">{driver1} Lap {track1.lap_number}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-1 rounded" style={{ background: color2 }} />
                  <span className="font-mono">{driver2} Lap {track2.lap_number}</span>
                </span>
              </div>
            </div>
            <TrackMap
              driver1={{ code: driver1, x: track1.x, y: track1.y, speed: track1.speed, color: color1 }}
              driver2={{ code: driver2, x: track2.x, y: track2.y, speed: track2.speed, color: color2 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
