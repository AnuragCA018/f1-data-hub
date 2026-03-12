import Link from "next/link";
import type { RaceEvent } from "@/types";

interface Props {
  race: RaceEvent;
  year: number;
}

const FORMAT_BADGE: Record<string, { label: string; cls: string }> = {
  sprint:             { label: "Sprint",  cls: "badge-yellow" },
  sprint_qualifying:  { label: "Sprint",  cls: "badge-yellow" },
  testing:            { label: "Test",    cls: "badge-gray" },
};

export default function RaceCard({ race, year }: Props) {
  const isPast     = new Date(race.date) < new Date();
  const formatData = FORMAT_BADGE[race.event_format ?? ""];

  return (
    <Link
      href={`/race/${year}/${race.round}`}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150"
      style={{
        background: isPast ? "transparent" : "#FF18010A",
        borderColor: isPast ? "#1E2535" : "#FF180125",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isPast ? "#2E3D55" : "#FF180150";
        (e.currentTarget as HTMLElement).style.background = isPast ? "#ffffff04" : "#FF18011A";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = isPast ? "#1E2535" : "#FF180125";
        (e.currentTarget as HTMLElement).style.background = isPast ? "transparent" : "#FF18010A";
      }}
    >
      {/* Round badge */}
      <div
        className="shrink-0 w-8 text-center"
      >
        <div className="text-[10px] font-bold text-[#6B7280] leading-none">R</div>
        <div
          className="text-lg font-black leading-tight"
          style={{ color: isPast ? "#9CA3AF" : "#FF1801" }}
        >
          {race.round}
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate leading-snug">
          {race.race_name}
        </div>
        <div className="text-[11px] text-[#6B7280] truncate mt-0.5">
          {race.circuit} Â· {race.date}
        </div>
      </div>

      {/* Right indicator */}
      <div className="shrink-0">
        {!isPast && <span className="badge badge-red text-[10px]">Next</span>}
        {isPast && formatData && <span className={`badge ${formatData.cls} text-[10px]`}>{formatData.label}</span>}
        {isPast && !formatData && (
          <svg
            className="w-4 h-4 text-[#6B7280] group-hover:text-[#9CA3AF] transition-colors"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </Link>
  );
}
