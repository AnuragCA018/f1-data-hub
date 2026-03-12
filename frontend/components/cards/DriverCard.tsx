import Link from "next/link";
import type { Driver } from "@/types";
import { DRIVER_COLORS } from "@/types";

interface Props {
  driver: Driver;
}

export default function DriverCard({ driver }: Props) {
  const color = DRIVER_COLORS[driver.driver_code] ?? "#9CA3AF";

  return (
    <Link
      href={`/driver/${driver.driver_code}`}
      className="group block rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, ${color}08, #141821)`,
        border: `1px solid ${color}20`,
        boxShadow: `0 1px 3px rgba(0,0,0,0.4)`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}50`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 24px ${color}20`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}20`;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.4)";
      }}
    >
      {/* Glow circle */}
      <div
        className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
      />

      <div className="relative z-10 flex items-center gap-3">
        {/* Color bar */}
        <div
          className="w-1 h-12 rounded-full shrink-0"
          style={{ background: `linear-gradient(180deg, ${color}, ${color}40)` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black font-mono leading-none" style={{ color }}>
              {driver.driver_code}
            </span>
            {driver.number != null && (
              <span className="text-xs text-[#6B7280]">#{driver.number}</span>
            )}
          </div>
          <div className="text-sm text-white font-medium truncate mt-0.5 leading-snug">
            {driver.name}
          </div>
          {driver.team && (
            <div className="text-xs text-[#6B7280] truncate mt-0.5">{driver.team}</div>
          )}
        </div>
        <svg
          className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
