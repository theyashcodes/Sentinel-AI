"use client";

interface SignalItem {
  id: string;
  title: string;
  time: string;
  dotColor: string;
}

const defaultSignals: SignalItem[] = [
  { id: "1", title: "New threat intel update available",     time: "47m ago", dotColor: "warn" },
  { id: "2", title: "Suspicious domain detected (blocked)", time: "2h ago",  dotColor: "crit" },
  { id: "3", title: "System scan completed",                time: "3h ago",  dotColor: "ok"   },
  { id: "4", title: "Project \"Client-Portal\" deployed",   time: "5h ago",  dotColor: "info"  },
];

const dotColors: Record<string, string> = {
  ok:   "var(--ok)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  info: "var(--accent)",
};

export function SignalFeed({ signals = defaultSignals }: { signals?: SignalItem[] }) {
  return (
    <div
      style={{
        backgroundColor: "var(--panel-card)",
        border: "1px solid var(--panel-card-border)",
        borderRadius: 0,
        boxShadow: "none",
        padding: "1.5rem",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid var(--hair-06)" }}>
        <span className="label" style={{ color: "var(--ink)" }}>Signal Feed</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <span className="status-dot pulse" style={{ width: "5px", height: "5px" }} />
          <span className="label" style={{ color: "var(--ok)" }}>Live</span>
        </div>
      </div>

      {/* Signal rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
        {signals.map((sig, i) => {
          const dotC = dotColors[sig.dotColor] || "var(--muted)";
          return (
            <div
              key={sig.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 0",
                borderTop: i === 0 ? "none" : "1px solid var(--hair-06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ width: "5px", height: "5px", backgroundColor: dotC, flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: 300, color: "var(--ink)" }}>{sig.title}</span>
              </div>
              <span className="label" style={{ color: "var(--muted)", flexShrink: 0, paddingLeft: "1rem" }}>{sig.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
