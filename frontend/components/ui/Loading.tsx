// Reusable loading skeleton with configurable height and count
export function SkeletonBlock({ h = "h-64", className = "" }: { h?: string; className?: string }) {
  return <div className={`skeleton ${h} rounded-xl ${className}`} />;
}

export function SkeletonRows({ n = 6, className = "" }: { n?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton h-8 rounded-lg" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}

export function SkeletonCards({ n = 4, className = "" }: { n?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton h-24 rounded-xl" />
      ))}
    </div>
  );
}

interface LoadingPanelProps {
  message?: string;
  sub?: string;
}

export function LoadingPanel({ message = "Loading data…", sub }: LoadingPanelProps) {
  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{ background: "#1F8BFF0A", border: "1px solid #1F8BFF25" }}
    >
      <div className="flex gap-1 shrink-0">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[#1F8BFF]"
            style={{ animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
      <div>
        <p className="text-[#1F8BFF] font-semibold text-sm">{message}</p>
        {sub && <p className="text-[#6B7280] text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface ErrorPanelProps {
  message: string;
  title?: string;
  onRetry?: () => void;
}

export function ErrorPanel({ message, title = "Error", onRetry }: ErrorPanelProps) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: "#FF180110", border: "1px solid #FF180130" }}
    >
      <span className="text-[#FF1801] text-lg mt-0.5 shrink-0">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="text-[#FF1801] font-semibold text-sm">{title}</p>
        <p className="text-[#9CA3AF] text-xs mt-1 break-words">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-xs shrink-0 py-1.5 px-3">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "📭", title = "No data", sub }: {
  icon?: string;
  title?: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3 opacity-50">{icon}</span>
      <p className="text-[#9CA3AF] font-semibold">{title}</p>
      {sub && <p className="text-[#6B7280] text-xs mt-1">{sub}</p>}
    </div>
  );
}
