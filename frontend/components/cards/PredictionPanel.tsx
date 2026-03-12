"use client";

import { DRIVER_COLORS, type PredictionResponse } from "@/types";
import ProbabilityBar from "@/components/charts/ProbabilityBar";

interface PredictionPanelProps {
  data: PredictionResponse;
}

const FEATURE_LABELS: Record<string, string> = {
  grid_pos:          "Grid Position",
  quali_gap_ms:      "Qualifying Gap",
  driver_points:     "Driver Points",
  team_points:       "Team Points",
  last_finish_pos:   "Last Finish",
  track_win_rate:    "Circuit Win Rate",
  track_podium_rate: "Circuit Podium Rate",
  dnf_rate:          "DNF Rate",
  season_win_rate:   "Season Win Rate",
};

export default function PredictionPanel({ data }: PredictionPanelProps) {
  const { predictions, race, circuit, model_version, algorithm, cv_auc, top_features, model_ready } = data;

  if (!model_ready) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "#141821", border: "1px solid #1E2535" }}
      >
        <div className="text-4xl mb-4">🤖</div>
        <h3 className="text-lg font-bold text-white mb-2">Model Not Trained</h3>
        <p className="text-[#9CA3AF] text-sm mb-4">{data.message}</p>
        <code
          className="block text-xs text-left p-3 rounded-lg overflow-x-auto"
          style={{ background: "#0B0D12", color: "#10B981" }}
        >
          {`cd backend\npython scripts/build_dataset.py --start 2018 --end 2024\npython scripts/train_model.py`}
        </code>
      </div>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <div
        className="rounded-xl p-6 text-center text-[#9CA3AF]"
        style={{ background: "#141821", border: "1px solid #1E2535" }}
      >
        No prediction data available.
      </div>
    );
  }

  const winner = predictions[0];
  const winnerColor = DRIVER_COLORS[winner.driver] ?? "#FF1801";
  const maxProb = winner.probability;

  // Top 5 features by importance
  const sortedFeatures = Object.entries(top_features)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxImportance = sortedFeatures[0]?.[1] ?? 1;

  return (
    <div className="space-y-4">
      {/* ── Hero winner card ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${winnerColor}10 0%, #14182100 100%), #141821`,
          border: `1px solid ${winnerColor}40`,
          boxShadow: `0 4px 24px ${winnerColor}20`,
        }}
      >
        {/* Glow blob */}
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-20 pointer-events-none -translate-y-16 translate-x-16"
          style={{ background: `radial-gradient(circle, ${winnerColor}60, transparent 70%)` }}
        />

        <div className="relative z-10 flex items-center gap-4">
          {/* Big driver code */}
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 font-black text-xl font-mono"
            style={{
              background: `${winnerColor}20`,
              border: `2px solid ${winnerColor}50`,
              color: winnerColor,
            }}
          >
            {winner.driver}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF] font-semibold mb-0.5">
              Predicted Winner
            </p>
            <h2 className="text-2xl font-black text-white leading-none truncate">
              {winner.driver}
            </h2>
            <p className="text-sm text-[#9CA3AF] mt-0.5 truncate">{winner.team}</p>
          </div>

          <div className="text-right shrink-0">
            <p
              className="text-4xl font-black font-mono leading-none"
              style={{ color: winnerColor }}
            >
              {winner.win_pct.toFixed(1)}
              <span className="text-xl">%</span>
            </p>
            <p className="text-[10px] text-[#6B7280] mt-1 uppercase tracking-widest">win prob.</p>
          </div>
        </div>

        {/* Race + circuit meta */}
        <div className="relative z-10 mt-3 flex gap-4 text-xs text-[#9CA3AF]">
          <span>📍 {circuit}</span>
          <span>🏁 {race}</span>
          <span>P{winner.grid_pos} on grid</span>
        </div>
      </div>

      {/* ── Full field probabilities ──────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#141821", border: "1px solid #1E2535" }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1E2535" }}>
          <h3 className="text-sm font-semibold text-white">Full Field Win Probability</h3>
          <span className="text-[11px] text-[#6B7280]">{predictions.length} drivers</span>
        </div>

        <div className="py-2 px-1">
          {predictions.map((drv, idx) => (
            <ProbabilityBar
              key={drv.driver}
              driver={drv.driver}
              team={drv.team}
              gridPos={drv.grid_pos}
              probability={drv.probability}
              winPct={drv.win_pct}
              rank={idx + 1}
              maxProbability={maxProb}
            />
          ))}
        </div>
      </div>

      {/* ── Feature importance + model info ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Feature importance */}
        {sortedFeatures.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{ background: "#141821", border: "1px solid #1E2535" }}
          >
            <h3 className="text-sm font-semibold text-white mb-3">Key Prediction Factors</h3>
            <div className="space-y-2">
              {sortedFeatures.map(([feat, imp]) => (
                <div key={feat} className="flex items-center gap-2">
                  <span className="text-xs text-[#9CA3AF] w-36 truncate shrink-0">
                    {FEATURE_LABELS[feat] ?? feat}
                  </span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1E2535" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(imp / maxImportance) * 100}%`,
                        background: "linear-gradient(90deg, #FF180180, #FF1801)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#6B7280] w-8 text-right shrink-0">
                    {(imp * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Model info */}
        <div
          className="rounded-xl p-4"
          style={{ background: "#141821", border: "1px solid #1E2535" }}
        >
          <h3 className="text-sm font-semibold text-white mb-3">Model Info</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Algorithm</span>
              <span className="text-white font-mono">{algorithm ?? "RandomForest + Platt"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Version</span>
              <span className="text-white font-mono">{model_version ?? "—"}</span>
            </div>
            {cv_auc != null && (
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">CV AUC</span>
                <span
                  className="font-mono font-bold"
                  style={{ color: cv_auc >= 0.8 ? "#10B981" : cv_auc >= 0.7 ? "#F59E0B" : "#EF4444" }}
                >
                  {cv_auc.toFixed(4)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Training data</span>
              <span className="text-white font-mono">2018–2024</span>
            </div>
            <div className="mt-3 pt-2 text-[#6B7280] text-[10px] leading-relaxed" style={{ borderTop: "1px solid #1E2535" }}>
              Probabilities are normalised per race. For entertainment / educational purposes. Not financial advice.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
