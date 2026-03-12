import type { RaceResult } from "@/types";
import { DRIVER_COLORS } from "@/types";

interface Props {
  results: RaceResult[];
}

const STATUS_BADGE: Record<string, string> = {
  Finished:  "badge-green",
  "+1 Lap":  "badge-yellow",
  "+2 Laps": "badge-yellow",
  Accident:  "badge-red",
  Retired:   "badge-red",
  DNF:       "badge-red",
  DSQ:       "badge-red",
  DNS:       "badge-gray",
};

function formatTime(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

export default function RaceResultsTable({ results }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="f1-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Driver</th>
            <th>Team</th>
            <th>Grid</th>
            <th>Time</th>
            <th>Points</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const color = DRIVER_COLORS[r.driver_code] ?? "#8892a4";
            const statusCls = Object.keys(STATUS_BADGE).find((k) =>
              r.status.includes(k)
            );
            const badgeCls = statusCls ? STATUS_BADGE[statusCls] : "badge-gray";
            const isPoints = r.position != null && r.position <= 10;

            return (
              <tr key={r.driver_code} className={isPoints ? "bg-[#FF1801]/[0.04]" : ""}>
                <td>
                  <span className={`font-bold text-base ${r.position === 1 ? "text-yellow-400" : r.position === 2 ? "text-gray-300" : r.position === 3 ? "text-amber-600" : "text-white"}`}>
                    {r.position ?? "—"}
                  </span>
                </td>
                <td>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: color }} />
                    <a
                      href={`/driver/${r.driver_code}`}
                      className="font-mono font-bold hover:text-[#FF1801] transition-colors"
                    >
                      {r.driver_code}
                    </a>
                    <span className="text-[#8892a4] text-xs hidden sm:inline">
                      {r.driver_name}
                    </span>
                    {r.fastest_lap && <span title="Fastest Lap">🟣</span>}
                  </span>
                </td>
                <td className="text-[#8892a4] text-xs">{r.team_name}</td>
                <td className="text-[#8892a4]">{r.grid_position ?? "—"}</td>
                <td className="font-mono text-xs">{formatTime(r.time_seconds)}</td>
                <td className={`font-bold ${isPoints ? "text-yellow-400" : "text-[#8892a4]"}`}>
                  {r.points > 0 ? r.points : "—"}
                </td>
                <td>
                  <span className={`badge ${badgeCls}`}>{r.status}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
