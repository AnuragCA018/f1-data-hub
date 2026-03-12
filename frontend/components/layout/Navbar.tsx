"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BREADCRUMB_MAP: Record<string, string> = {
  "":          "Dashboard",
  telemetry:   "Telemetry",
  track:       "Track Map",
  qualifying:  "Qualifying",
  race:        "Race",
  driver:      "Driver",
};

export default function Navbar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = [
    { label: "F1 Data Hub", href: "/" },
    ...segments.map((seg, i) => ({
      label: BREADCRUMB_MAP[seg] ?? seg.toUpperCase(),
      href: "/" + segments.slice(0, i + 1).join("/"),
    })),
  ];

  return (
    <header
      className="h-13 shrink-0 flex items-center justify-between px-5"
      style={{
        background: "rgba(11,13,18,0.85)",
        borderBottom: "1px solid #1E2535",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        height: "52px",
      }}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[#2E3D55] text-xs select-none">/</span>}
            <Link
              href={c.href}
              className={
                i === crumbs.length - 1
                  ? "text-white font-semibold text-sm"
                  : "text-[#6B7280] hover:text-[#9CA3AF] text-sm transition-colors"
              }
            >
              {c.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Status pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: "#0F1A0F", border: "1px solid #1A3A1A" }}
        >
          <span className="live-dot" />
          <span className="text-emerald-400">API Online</span>
        </div>

        {/* Docs link */}
        <a
          href="https://docs.fastf1.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost text-xs"
        >
          Docs â†—
        </a>
      </div>
    </header>
  );
}
