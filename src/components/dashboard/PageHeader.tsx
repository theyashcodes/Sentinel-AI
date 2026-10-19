import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode; // For actions/buttons
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginBottom: "2rem",
        paddingBottom: "1.25rem",
        borderBottom: "1px solid var(--hair-06)",
      }}
      className="sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p className="label" style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>
          Sentinel Command Center
        </p>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              marginTop: "0.5rem",
              maxWidth: "42rem",
              fontSize: "13px",
              fontWeight: 300,
              lineHeight: 1.6,
              color: "var(--muted)",
              margin: 0,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}
