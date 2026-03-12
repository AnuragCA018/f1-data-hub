"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/",           label: "Dashboard",          icon: "⬡", shortcut: "D" },
    ],
  },
  {
    label: "Race Data",
    items: [
      { href: "/telemetry",  label: "Telemetry",          icon: "◈", shortcut: "T" },
      { href: "/track",      label: "Track Map",          icon: "◉", shortcut: "M" },
      { href: "/qualifying", label: "Qualifying",         icon: "⏲", shortcut: "Q" },
    ],
  },
  // AI & Insights section re-enabled once model is trained
  // {
  //   label: "AI & Insights",
  //   items: [
  //     { href: "/prediction", label: "Race Prediction", icon: "🤖", shortcut: "P" },
  //   ],
  // },
];

const FEATURED_DRIVERS = [
  { code: "VER", color: "#3671C6" },
  { code: "NOR", color: "#FF8000" },
  { code: "LEC", color: "#FF1801" },
  { code: "HAM", color: "#27F4D2" },
  { code: "RUS", color: "#27F4D2" },
  { code: "SAI", color: "#FF1801" },
  { code: "ALO", color: "#358C75" },
  { code: "PIA", color: "#FF8000" },
];

const SEASON_RACES = [
  { year: 2026, label: "2026 Season" },
  { year: 2025, label: "2025 Season" },
  { year: 2024, label: "2024 Season" },
  { year: 2023, label: "2023 Season" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 shrink-0 flex flex-col overflow-y-auto"
      style={{
        background: "linear-gradient(180deg, #0F1219 0%, #0B0D12 100%)",
        borderRight: "1px solid #1E2535",
      }}
    >
      {/* â”€â”€ Logo â”€â”€ */}
      <div className="px-4 pt-5 pb-4">
        <Link href="/" className="flex items-center gap-3 group" title="Go to Home">
          <img
            src="/fdh-logo.png"
            alt="F1 Data Hub"
            className="w-10 h-10 rounded-xl shrink-0 object-cover transition-transform duration-150 group-hover:scale-110"
            style={{ boxShadow: "0 0 16px 0 #FF180150" }}
          />
          <div>
            <div className="font-bold text-white text-sm leading-none group-hover:text-[#FF1801] transition-colors duration-150">F1 Data Hub</div>
            <div className="text-[10px] text-[#6B7280] mt-0.5 leading-none">Data Platform</div>
          </div>
        </Link>
      </div>

      <div className="divider" />

      {/* â”€â”€ Navigation â”€â”€ */}
      <nav className="px-2 pt-3 space-y-4 flex-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="data-label px-3 pb-1.5">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive ? "active" : ""}`}
                  >
                    <span className="nav-link-icon text-base leading-none">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: "#FF1801", boxShadow: "0 0 6px #FF1801" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* â”€â”€ Season Quick Access â”€â”€ */}
        <div>
          <p className="data-label px-3 pb-1.5">Seasons</p>
          <div className="space-y-0.5">
            {SEASON_RACES.map(({ year, label }) => (
              <a
                key={year}
                href={`/race/${year}/1`}
                className="nav-link text-xs"
              >
                <span className="nav-link-icon text-xs">▶</span>
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* â”€â”€ Featured Drivers â”€â”€ */}
        <div>
          <p className="data-label px-3 pb-1.5">Drivers</p>
          <div className="px-2 grid grid-cols-4 gap-1.5">
            {FEATURED_DRIVERS.map(({ code, color }) => (
              <Link
                key={code}
                href={`/driver/${code}`}
                title={code}
                className="flex items-center justify-center py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all duration-150 hover:scale-105"
                style={{
                  background: `${color}15`,
                  color,
                  border: `1px solid ${color}30`,
                }}
              >
                {code}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* â”€â”€ Footer status â”€â”€ */}
      <div className="divider" />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="live-dot" />
          <span className="text-xs text-[#9CA3AF] font-medium">FastF1 Active</span>
        </div>
        <div className="text-[10px] text-[#6B7280]">Seasons 2020 – 2026</div>
        <div className="text-[10px] text-[#6B7280] mt-0.5">
          v2.0 Â· Local
        </div>
      </div>
    </aside>
  );
}
