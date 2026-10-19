"use client";

import { ReactNode, useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Sidebar } from "./Sidebar";
import { ForceFieldBackground } from "@/components/effects/ForceFieldBackground";
import { DayModeBackground } from "@/components/effects/DayModeBackground";
import { CyBroWidget } from "@/components/cybro/CyBroWidget";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, theme } = useTheme();

  const [particlesEnabled, setParticlesEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const savedParticles = localStorage.getItem("sentinel_particle_animation");
      if (savedParticles === "false") {
        setParticlesEnabled(false);
      }
    } catch {
      // ignore
    }

    const handleParticleChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === "boolean") {
        setParticlesEnabled(customEvent.detail);
      }
    };

    window.addEventListener("sentinel_particle_animation_change", handleParticleChange);
    return () => {
      window.removeEventListener("sentinel_particle_animation_change", handleParticleChange);
    };
  }, []);

  const isLight = mounted && (resolvedTheme === "light" || theme === "light");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        position: "relative",
        overflowX: "hidden",
        backgroundColor: "var(--ground)",
        color: "var(--ink)",
        fontFamily: "'Inter', ui-sans-serif, sans-serif",
        fontWeight: 300,
        transition: "background-color 0.25s ease, color 0.25s ease",
      }}
    >
      {/* ── Fixed full-screen responsive background — adapts to dark void or day mode ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        {!particlesEnabled ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: isLight ? "#F8FAFC" : "#0A0A0A",
              backgroundImage: isLight
                ? "radial-gradient(rgba(15,23,42,0.06) 1.2px, transparent 1.2px)"
                : "radial-gradient(rgba(255,255,255,0.06) 1.2px, transparent 1.2px)",
              backgroundSize: "24px 24px",
            }}
          />
        ) : isLight ? (
          <DayModeBackground />
        ) : (
          <ForceFieldBackground
            hue={240}
            saturation={80}
            spacing={11}
            minStroke={1}
            maxStroke={4}
            forceStrength={12}
            magnifierRadius={160}
            friction={0.88}
            restoreSpeed={0.04}
            density={1.8}
          />
        )}
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            backgroundColor: "rgba(0,0,0,0.70)",
          }}
          className="md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed sidebar — sits above the background */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content area */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          minHeight: "100vh",
          paddingTop: "1.5rem",
          paddingBottom: "3rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
        className="md:ml-60"
      >
        {/* Mobile top bar */}
        <div
          className="md:hidden"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--hair-06)",
          }}
        >
          <button
            style={{
              padding: "0.375rem",
              background: "transparent",
              border: "1px solid var(--hair-10)",
              cursor: "pointer",
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Toggle navigation"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <Image
              src="/logo-icon.png"
              alt="Sentinel AI"
              width={18}
              height={18}
              className="dark:invert dark:brightness-100 brightness-0"
              style={{ objectFit: "contain" }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 300,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--ink)",
              }}
            >
              Sentinel <span style={{ color: "var(--accent)" }}>AI</span>
            </span>
          </div>
        </div>

        {children}
      </main>

      {/* ── CyBro Floating Cyber Assistant ── */}
      <CyBroWidget />
    </div>
  );
}
