"use client";

import { useEffect, ReactNode } from "react";

interface LiquidGLProviderProps {
  children: ReactNode;
}

export function LiquidGLProvider({ children }: LiquidGLProviderProps) {
  useEffect(() => {
    let glassInstance: any = null;

    const initLiquidGL = async () => {
      try {
        const { default: liquidGL } = await import("liquid-gl");

        // Allow DOM to settle before snapshotting
        setTimeout(() => {
          const targets = document.querySelectorAll(".liquid-gl-surface");
          if (!targets.length) return;

          glassInstance = liquidGL({
            target: ".liquid-gl-surface",
            snapshot: "body",
            engine: "auto",
            resolution: 1.5,
            interaction: "fluid",
            interactionStrength: 0.5,
            interactionRadius: 0.3,
            interactionViscosity: 0.6,
            tilt: true,
            tiltFactor: 5,
            tiltEase: 300,
            specular: true,
            bevelDepth: 0.08,
            bevelWidth: 0.12,
            frost: 4,
            refraction: 0.012,
            aberration: 0.015,
            tint: "rgba(255, 255, 255, 0.5)",
            shadow: true,
            reveal: "fade",
          });
        }, 150);
      } catch (err) {
        console.warn("liquidGL initialization fallback to CSS glassmorphism:", err);
      }
    };

    initLiquidGL();

    return () => {
      try {
        if (glassInstance?.destroy) {
          glassInstance.destroy();
        }
      } catch {
        // Cleanup silently
      }
    };
  }, []);

  return <>{children}</>;
}
