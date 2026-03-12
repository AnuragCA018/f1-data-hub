"use client";

import { DRIVER_COLORS } from "@/types";

interface ProbabilityBarProps {
  driver: string;
  team: string;
  gridPos: number;
  probability: number;
  winPct: number;
  rank: number;
  maxProbability: number;
}

export default function ProbabilityBar({
  driver,
  team,
  gridPos,
  winPct,
  rank,
  maxProbability,
}: ProbabilityBarProps) {
  const color = DRIVER_COLORS[driver] ?? "#9CA3AF";
  const barWidth = maxProbability > 0 ? (winPct / (maxProbability * 100)) * 100 : 0;
  const isLeader = rank === 1;

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 hover:bg-white/5"
      style={{ borderLeft: isLeader ? `3px solid ${color}` : "3px solid transparent" }}
    >
      {/* Rank */}
      <span
        className="text-xs font-mono font-bold w-5 shrink-0 text-center"
        style={{ color: rank <= 3 ? color : "#6B7280" }}
      >
        {rank}
      </span>

      {/* Driver code */}
      <span
        className="text-sm font-bold font-mono w-10 shrink-0"
        style={{ color }}
      >
        {driver}
      </span>

      {/* Grid badge */}
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
        style={{ background: "#1E2535", color: "#9CA3AF" }}
      >
        P{gridPos}
      </span>

      {/* Bar */}
      <div className="flex-1 relative h-4 rounded-full overflow-hidden" style={{ background: "#1E2535" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.max(barWidth, 1)}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: isLeader ? `0 0 8px ${color}60` : undefined,
          }}
        />
      </div>

      {/* Win% */}
      <span
        className="text-sm font-mono font-bold w-12 text-right shrink-0"
        style={{ color: isLeader ? color : "#D1D5DB" }}
      >
        {winPct.toFixed(1)}%
      </span>

      {/* Team */}
      <span className="hidden lg:inline text-[11px] text-[#6B7280] w-28 truncate shrink-0">
        {team}
      </span>
    </div>
  );
}
