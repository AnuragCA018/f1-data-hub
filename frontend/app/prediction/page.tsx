"use client";

import { useState } from "react";
import { fetchSchedule, fetchWinnerPrediction } from "@/services/api";
import type { PredictionResponse, RaceEvent } from "@/types";
import PredictionPanel from "@/components/cards/PredictionPanel";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [2024, 2023, 2022, 2021, 2020];

export default function PredictionPage() {
  const [year, setYear]       = useState(CURRENT_YEAR);
  const [round, setRound]     = useState(1);
  const [schedule, setSchedule] = useState<RaceEvent[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [data, setData]       = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function loadSchedule(y: number) {
    setScheduleLoading(true);
    fetchSchedule(y)
      .then((res) => {
        setSchedule(res.races);
        if (res.races.length > 0) setRound(res.races[0].round);
      })
      .catch(() => setSchedule([]))
      .finally(() => setScheduleLoading(false));
  }

  function handleYearChange(y: number) {
    setYear(y);
    setData(null);
    setError(null);
    loadSchedule(y);
  }

  function predict() {
    setLoading(true);
    setError(null);
    setData(null);
    fetchWinnerPrediction(year, round)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  const selectedRace = schedule.find((r) => r.round === round);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">🤖 Race Prediction</h1>
        <p className="page-subtitle">
          XGBoost AI model — predicts win probabilities using grid position, qualifying
          gap, championship points, circuit history, and driver form.
        </p>
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Year */}
          <div>
            <label className="data-label block mb-1.5">Season</label>
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="f1-select"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Race */}
          <div>
            <label className="data-label block mb-1.5">Race</label>
            {schedule.length > 0 ? (
              <select
                value={round}
                onChange={(e) => setRound(Number(e.target.value))}
                className="f1-select"
              >
                {schedule.map((r) => (
                  <option key={r.round} value={r.round}>
                    R{r.round} — {r.race_name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={round}
                  onChange={(e) => setRound(Number(e.target.value))}
                  className="f1-input w-20"
                />
                <button
                  onClick={() => loadSchedule(year)}
                  disabled={scheduleLoading}
                  className="btn-secondary text-xs px-3 disabled:opacity-50"
                >
                  {scheduleLoading ? "…" : "Load races"}
                </button>
              </div>
            )}
          </div>

          {/* Race info preview */}
          {selectedRace && (
            <div className="flex flex-col justify-end">
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Selected</p>
              <p className="text-sm text-white font-medium">{selectedRace.race_name}</p>
              <p className="text-xs text-[#9CA3AF]">
                {selectedRace.circuit} · {selectedRace.date?.slice(0, 10)}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={predict}
          disabled={loading}
          className="mt-4 btn-primary disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Predicting… (FastF1 may need a minute)
            </>
          ) : (
            "Predict Winner"
          )}
        </button>

        {loading && (
          <p className="text-[11px] text-[#6B7280] mt-2">
            FastF1 is downloading session data — this can take 30–60 s on first load.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: "#FF180110", border: "1px solid #FF180130", color: "#FF6B6B" }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && !data && (
        <div className="space-y-3">
          <div className="skeleton h-36 rounded-xl" />
          <div className="skeleton h-96 rounded-xl" />
        </div>
      )}

      {/* Results */}
      {data && <PredictionPanel data={data} />}

      {/* Info cards */}
      {!data && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🧠", title: "XGBoost Classifier", body: "Gradient-boosted decision trees with Platt probability calibration — optimised for rare-event (winner) prediction." },
            { icon: "📊", title: "Features Used", body: "Grid position, qualifying gap to pole, championship points, circuit win/podium history, DNF rate, and season form." },
            { icon: "🔄", title: "Training Data", body: "2018–2024 F1 seasons via FastF1. Retrain any time with build_dataset.py + train_model.py." },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-xl p-4"
              style={{ background: "#141821", border: "1px solid #1E2535" }}
            >
              <div className="text-2xl mb-2">{c.icon}</div>
              <h3 className="text-sm font-bold text-white mb-1">{c.title}</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
