import Link from "next/link";
import type { DriverStanding, ConstructorStanding } from "@/types";
import { DRIVER_COLORS } from "@/types";

type DriverData = DriverStanding;
type ConstructorData = ConstructorStanding;

interface DriverProps {
  data: DriverData[];
  type: "driver";
}
interface ConstructorProps {
  data: ConstructorData[];
  type: "constructor";
}

type Props = DriverProps | ConstructorProps;

function PointsBar({ points, max }: { points: number; max: number }) {
  const pct = max > 0 ? (points / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 rounded-full h-1.5 min-w-0" style={{ background: "#1E2535" }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #FF1801, #FF6B35)" }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-white shrink-0">{points}</span>
    </div>
  );
}

export default function StandingsTable(props: Props) {
  const maxPoints =
    props.type === "driver"
      ? Math.max(...props.data.map((d) => d.points), 1)
      : Math.max(...props.data.map((c) => c.points), 1);

  if (props.type === "driver") {
    return (
      <div className="space-y-1">
        {props.data.map((d) => {
          const color = DRIVER_COLORS[d.driver_code] ?? "#8892a4";
          return (
            <div key={d.driver_code} className="flex items-center gap-3 py-1.5">
              <span className="w-5 text-xs text-center text-[#8892a4] shrink-0">{d.position}</span>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <Link href={`/driver/${d.driver_code}`} className="font-mono text-sm font-bold hover:text-[#FF1801] w-9 shrink-0 transition-colors">
                {d.driver_code}
              </Link>
              <div className="flex-1 min-w-0">
                <PointsBar points={d.points} max={maxPoints} />
              </div>
              {d.wins > 0 && (
                <span className="text-xs text-yellow-400 shrink-0">{d.wins}W</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {props.data.map((c) => (
        <div key={c.team_name} className="flex items-center gap-3 py-1.5">
          <span className="w-5 text-xs text-center text-[#8892a4] shrink-0">{c.position}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate mb-0.5">{c.team_name}</div>
            <PointsBar points={c.points} max={maxPoints} />
          </div>
          {c.wins > 0 && (
            <span className="text-xs text-yellow-400 shrink-0">{c.wins}W</span>
          )}
        </div>
      ))}
    </div>
  );
}
