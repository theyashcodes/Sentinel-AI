"use client";

import { ReactNode } from "react";

interface LiquidGlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

/**
 * VoidPanel / DayPanel — Adaptive Sentinel Card Primitive
 * Automatically switches between Dark Void (#18181B) and Quantum Day frosted white (rgba(255,255,255,0.90)).
 * Preserves zero-radius, hairline borders, and pure backdrop blur.
 */
export function LiquidGlassCard({
  children,
  className = "",
  onClick,
}: LiquidGlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        backgroundColor: "var(--panel-card)",
        border: "1px solid var(--panel-card-border)",
        borderRadius: 0,
        boxShadow: "none",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        color: "var(--ink)",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
