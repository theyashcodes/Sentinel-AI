import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-3xl liquid-glass-panel px-6 py-20 text-center shadow-[0_12px_36px_-6px_rgba(15,23,42,0.06)] group">
      {/* Ambient soft glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-200/40 via-indigo-100/30 to-transparent blur-3xl" />
      
      {/* 3D Glass Icon Container with Specular Ring */}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-50/90 to-indigo-50/90 border border-white shadow-[0_4px_16px_rgba(59,130,246,0.12)] transition-transform duration-300 group-hover:scale-105">
        <div className="absolute inset-x-2 top-1 h-3 rounded-full bg-white/60 blur-[0.5px]" />
        <Icon className="h-9 w-9 text-blue-600 drop-shadow-[0_2px_4px_rgba(37,99,235,0.2)]" aria-hidden="true" />
      </div>

      {/* Typography */}
      <h3 
        className="relative mt-6 font-display text-xl font-bold tracking-tight"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h3>
      <p 
        className="relative mt-2 max-w-md text-sm leading-relaxed font-medium"
        style={{ color: "var(--muted)" }}
      >
        {description}
      </p>

      {/* Action button */}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
