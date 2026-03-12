interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
  color?: "red" | "green" | "blue" | "yellow" | "gray" | "purple";
}

const THEME = {
  red:    { bg: "#FF180108", border: "#FF180125", accent: "#FF1801", glow: "#FF180130" },
  green:  { bg: "#10B98108", border: "#10B98125", accent: "#10B981", glow: "#10B98130" },
  blue:   { bg: "#1F8BFF08", border: "#1F8BFF25", accent: "#1F8BFF", glow: "#1F8BFF30" },
  yellow: { bg: "#F59E0B08", border: "#F59E0B25", accent: "#F59E0B", glow: "#F59E0B30" },
  gray:   { bg: "#ffffff04", border: "#1E2535",   accent: "#9CA3AF", glow: "transparent" },
  purple: { bg: "#A855F708", border: "#A855F725", accent: "#A855F7", glow: "#A855F730" },
};

export default function StatCard({ label, value, sub, icon, color = "gray" }: StatCardProps) {
  const t = THEME[color];
  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: `linear-gradient(135deg, ${t.bg} 0%, #14182100 100%), #141821`,
        border: `1px solid ${t.border}`,
        boxShadow: `0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 ${t.border}`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 pointer-events-none -translate-y-6 translate-x-6"
        style={{ background: `radial-gradient(circle, ${t.glow}, transparent 70%)` }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <p className="data-label">{label}</p>
          {icon && (
            <span
              className="text-base w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
              style={{ background: `${t.accent}15`, fontSize: "14px" }}
            >
              {icon}
            </span>
          )}
        </div>
        <p
          className="text-2xl font-bold font-mono leading-none tracking-tight"
          style={{ color: color === "gray" ? "#FFFFFF" : t.accent }}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-[#6B7280] mt-1.5 font-medium">{sub}</p>}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-[1px] w-1/2 opacity-60"
        style={{ background: `linear-gradient(90deg, ${t.accent}, transparent)` }}
      />
    </div>
  );
}
