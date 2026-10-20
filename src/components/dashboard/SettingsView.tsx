"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  Monitor,
  Shield,
  Bell,
  Key,
  Check,
  Sparkles,
  Sliders,
  Cpu,
  RefreshCw,
  Lock,
  Smile,
} from "lucide-react";
import { CyBroAvatar, CYBRO_SKINS, CyBroSkin } from "@/components/cybro/CyBroAvatar";

export function SettingsView() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Workspace settings state
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);
  const [autoQuarantine, setAutoQuarantine] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [sensitivity, setSensitivity] = useState<"standard" | "high" | "paranoid">("high");
  const [showCyBro, setShowCyBro] = useState(true);
  const [selectedSkin, setSelectedSkin] = useState<CyBroSkin>("classic");
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("sentinel_show_cybro");
      if (saved === "false") {
        setShowCyBro(false);
      }
      const savedParticles = localStorage.getItem("sentinel_particle_animation");
      if (savedParticles === "false") {
        setParticlesEnabled(false);
      }
      const savedSkin = localStorage.getItem("sentinel_cybro_skin") as CyBroSkin;
      if (savedSkin && CYBRO_SKINS.some((s) => s.id === savedSkin)) {
        setSelectedSkin(savedSkin);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSelectSkin = (skinId: CyBroSkin) => {
    setSelectedSkin(skinId);
    try {
      localStorage.setItem("sentinel_cybro_skin", skinId);
      window.dispatchEvent(new CustomEvent("sentinel_cybro_skin_change", { detail: skinId }));
    } catch {
      // ignore
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2400);
  };

  const handleToggleParticles = () => {
    const nextVal = !particlesEnabled;
    setParticlesEnabled(nextVal);
    try {
      localStorage.setItem("sentinel_particle_animation", String(nextVal));
      window.dispatchEvent(new CustomEvent("sentinel_particle_animation_change", { detail: nextVal }));
    } catch {
      // ignore
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2400);
  };

  const handleToggleCyBro = () => {
    const nextValue = !showCyBro;
    setShowCyBro(nextValue);
    try {
      localStorage.setItem("sentinel_show_cybro", String(nextValue));
      window.dispatchEvent(new CustomEvent("sentinel_cybro_visibility", { detail: nextValue }));
    } catch {
      // ignore
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2400);
  };

  const currentTheme = mounted ? (resolvedTheme || theme || "dark") : "dark";
  const isDark = currentTheme === "dark";

  const handleSelectTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2400);
  };

  const handleSavePreferences = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "960px" }}>
      {/* ──────────────────────────────────────────────────────────
          SECTION 1: APPEARANCE & THEME (MAIN FEATURE)
          ────────────────────────────────────────────────────────── */}
      <div
        className="void-panel"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid var(--hair-06)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="label" style={{ color: "var(--accent)" }}>System Interface</span>
              <span className="status-dot info pulse" style={{ width: "5px", height: "5px" }} />
            </div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 400,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
                margin: "0.25rem 0 0.5rem 0",
              }}
            >
              Theme & Visual Environment
            </h2>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 300,
                color: "var(--muted)",
                margin: 0,
                maxWidth: "600px",
                lineHeight: 1.5,
              }}
            >
              Toggle between Void Ground (Dark Mode) with magnetic particle force fields, or Quantum Daylight (Day Mode) with interactive responsive particle flux.
            </p>
          </div>

          {/* Quick Segmented Toggle */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: "var(--ground-secondary)",
              border: "1px solid var(--hair-10)",
              padding: "3px",
              gap: "2px",
            }}
          >
            <button
              type="button"
              id="theme-toggle-dark"
              onClick={() => handleSelectTheme("dark")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 0.9rem",
                fontSize: "11px",
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                border: isDark ? "1px solid var(--accent)" : "1px solid transparent",
                backgroundColor: isDark ? "var(--panel-card)" : "transparent",
                color: isDark ? "var(--ink)" : "var(--muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Moon style={{ width: "13px", height: "13px", color: isDark ? "var(--accent)" : "var(--muted)" }} />
              <span>Dark Void</span>
            </button>

            <button
              type="button"
              id="theme-toggle-light"
              onClick={() => handleSelectTheme("light")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 0.9rem",
                fontSize: "11px",
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                border: !isDark ? "1px solid var(--accent)" : "1px solid transparent",
                backgroundColor: !isDark ? "var(--panel-card)" : "transparent",
                color: !isDark ? "var(--ink)" : "var(--muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Sun style={{ width: "13px", height: "13px", color: !isDark ? "var(--accent)" : "var(--muted)" }} />
              <span>Day Mode</span>
            </button>
          </div>
        </div>

        {/* Visual Cards Selection */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {/* Card 1: Void Ground (Dark Mode) */}
          <div
            id="theme-card-dark"
            onClick={() => handleSelectTheme("dark")}
            style={{
              padding: "1.25rem",
              border: isDark ? "1px solid var(--accent)" : "1px solid var(--hair-10)",
              backgroundColor: isDark ? "var(--accent-subtle)" : "var(--panel-card)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              transition: "border-color 0.2s ease, background-color 0.2s ease",
              position: "relative",
            }}
          >
            {/* Miniature illustration representing Dark Void */}
            <div
              style={{
                height: "120px",
                width: "100%",
                backgroundColor: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Particle dots illustration */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.25,
                  backgroundImage: "radial-gradient(#6366F1 1px, transparent 1px)",
                  backgroundSize: "12px 12px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
                <div style={{ width: "24px", height: "4px", backgroundColor: "#6366F1" }} />
                <div style={{ width: "8px", height: "8px", backgroundColor: "#22C55E" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", position: "relative", zIndex: 2 }}>
                <div style={{ height: "34px", backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.08)", padding: "6px" }}>
                  <div style={{ width: "50%", height: "3px", backgroundColor: "rgba(255,255,255,0.4)" }} />
                  <div style={{ width: "30%", height: "8px", backgroundColor: "#6366F1", marginTop: "4px" }} />
                </div>
                <div style={{ height: "34px", backgroundColor: "#18181B", border: "1px solid rgba(255,255,255,0.08)", padding: "6px" }}>
                  <div style={{ width: "60%", height: "3px", backgroundColor: "rgba(255,255,255,0.4)" }} />
                  <div style={{ width: "40%", height: "8px", backgroundColor: "#22C55E", marginTop: "4px" }} />
                </div>
              </div>
            </div>

            {/* Info */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 400, color: "var(--ink)", margin: 0 }}>
                  Void Ground (Dark Mode)
                </h3>
                {isDark && (
                  <span
                    className="label"
                    style={{
                      color: "var(--accent)",
                      backgroundColor: "var(--accent-subtle)",
                      padding: "2px 6px",
                      border: "1px solid var(--accent)",
                    }}
                  >
                    Active
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", fontWeight: 300, color: "var(--muted)", margin: "0.375rem 0 0 0", lineHeight: 1.5 }}>
                Deep space void (#0A0A0A), high-contrast hairlines, and magnetic force field particles.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "auto" }}>
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  border: isDark ? "1px solid var(--accent)" : "1px solid var(--hair-10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "var(--accent)" : "transparent",
                }}
              >
                {isDark && <Check style={{ width: "10px", height: "10px", color: "#fff" }} />}
              </div>
              <span className="label" style={{ color: isDark ? "var(--ink)" : "var(--muted)" }}>
                {isDark ? "Selected Theme" : "Select Dark Mode"}
              </span>
            </div>
          </div>

          {/* Card 2: Quantum Daylight (Day Mode) */}
          <div
            id="theme-card-light"
            onClick={() => handleSelectTheme("light")}
            style={{
              padding: "1.25rem",
              border: !isDark ? "1px solid var(--accent)" : "1px solid var(--hair-10)",
              backgroundColor: !isDark ? "var(--accent-subtle)" : "var(--panel-card)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              transition: "border-color 0.2s ease, background-color 0.2s ease",
              position: "relative",
            }}
          >
            {/* Miniature illustration representing Day Mode */}
            <div
              style={{
                height: "120px",
                width: "100%",
                backgroundColor: "#F4F6F9",
                border: "1px solid rgba(15,23,42,0.12)",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Particle dots illustration */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.35,
                  backgroundImage: "radial-gradient(#4F46E5 1.2px, transparent 1.2px)",
                  backgroundSize: "12px 12px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
                <div style={{ width: "24px", height: "4px", backgroundColor: "#4F46E5" }} />
                <div style={{ width: "8px", height: "8px", backgroundColor: "#16A34A" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", position: "relative", zIndex: 2 }}>
                <div style={{ height: "34px", backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.10)", padding: "6px" }}>
                  <div style={{ width: "50%", height: "3px", backgroundColor: "rgba(15,23,42,0.4)" }} />
                  <div style={{ width: "30%", height: "8px", backgroundColor: "#4F46E5", marginTop: "4px" }} />
                </div>
                <div style={{ height: "34px", backgroundColor: "#FFFFFF", border: "1px solid rgba(15,23,42,0.10)", padding: "6px" }}>
                  <div style={{ width: "60%", height: "3px", backgroundColor: "rgba(15,23,42,0.4)" }} />
                  <div style={{ width: "40%", height: "8px", backgroundColor: "#16A34A", marginTop: "4px" }} />
                </div>
              </div>
            </div>

            {/* Info */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 400, color: "var(--ink)", margin: 0 }}>
                  Quantum Daylight (Day Mode)
                </h3>
                {!isDark && (
                  <span
                    className="label"
                    style={{
                      color: "var(--accent)",
                      backgroundColor: "var(--accent-subtle)",
                      padding: "2px 6px",
                      border: "1px solid var(--accent)",
                    }}
                  >
                    Active
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", fontWeight: 300, color: "var(--muted)", margin: "0.375rem 0 0 0", lineHeight: 1.5 }}>
                Clean daylight ground (#F4F6F9), frosted panels, and responsive daylight particle flux similar to the login page.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "auto" }}>
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  border: !isDark ? "1px solid var(--accent)" : "1px solid var(--hair-10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: !isDark ? "var(--accent)" : "transparent",
                }}
              >
                {!isDark && <Check style={{ width: "10px", height: "10px", color: "#fff" }} />}
              </div>
              <span className="label" style={{ color: !isDark ? "var(--ink)" : "var(--muted)" }}>
                {!isDark ? "Selected Theme" : "Select Day Mode"}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle: Dynamic Particle Flux Animation */}
        <div
          id="toggle-particle-flux"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--hair-06)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles style={{ width: "14px", height: "14px", color: "var(--accent)" }} />
              <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink)", margin: 0 }}>
                Dynamic Particle Flux Animation
              </p>
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  backgroundColor: particlesEnabled ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                  color: particlesEnabled ? "#10B981" : "var(--muted)",
                  border: `1px solid ${particlesEnabled ? "rgba(16, 185, 129, 0.3)" : "var(--hair-10)"}`,
                  padding: "1px 6px",
                  borderRadius: "10px",
                }}
              >
                {particlesEnabled ? "ENABLED" : "PAUSED"}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.25rem 0 0 0" }}>
              Interactive magnetic force-field particles and ambient quantum flux. Turn off to reduce GPU usage and motion.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleParticles}
            aria-label="Toggle Particle Flux Animation"
            style={{
              width: "40px",
              height: "22px",
              backgroundColor: particlesEnabled ? "var(--accent)" : "var(--hair-10)",
              border: "none",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              transition: "background-color 0.2s ease",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                backgroundColor: "#FFFFFF",
                transform: particlesEnabled ? "translateX(18px)" : "translateX(0)",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
        </div>

        {/* Feedback confirmation banner */}
        {saveSuccess && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
              color: "var(--ok)",
              fontSize: "12px",
            }}
          >
            <Check style={{ width: "14px", height: "14px", flexShrink: 0 }} />
            <span>Theme applied and stored in profile configuration.</span>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          SECTION 2: SECURITY & SCAN TELEMETRY
          ────────────────────────────────────────────────────────── */}
      <div
        className="void-panel"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--hair-06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Shield style={{ width: "14px", height: "14px", color: "var(--accent)" }} />
            <span className="label" style={{ color: "var(--ink)" }}>Security Protocol & Engine</span>
          </div>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.25rem 0 0 0" }}>
            Adjust diagnostic sensitivity, autonomous threat containment, and real-time telemetry streaming.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Toggle: Live Telemetry */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--hair-06)",
            }}
          >
            <div>
              <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink)", margin: 0 }}>
                Real-Time Telemetry Stream
              </p>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.25rem 0 0 0" }}>
                Stream active perimeter threat diagnostics via WebSocket to all authorized clients.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTelemetryEnabled(!telemetryEnabled)}
              style={{
                width: "40px",
                height: "22px",
                backgroundColor: telemetryEnabled ? "var(--accent)" : "var(--hair-10)",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                transition: "background-color 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  backgroundColor: "#FFFFFF",
                  transform: telemetryEnabled ? "translateX(18px)" : "translateX(0)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          </div>

          {/* Toggle: Autonomous Threat Quarantine */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--hair-06)",
            }}
          >
            <div>
              <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink)", margin: 0 }}>
                Autonomous Threat Quarantine
              </p>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.25rem 0 0 0" }}>
                Immediately revoke compromised API credentials and isolate affected ingress endpoints upon critical threat detection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoQuarantine(!autoQuarantine)}
              style={{
                width: "40px",
                height: "22px",
                backgroundColor: autoQuarantine ? "var(--accent)" : "var(--hair-10)",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                transition: "background-color 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  backgroundColor: "#FFFFFF",
                  transform: autoQuarantine ? "translateX(18px)" : "translateX(0)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          </div>

          {/* Toggle: CyBro Floating AI Copilot */}
          <div
            id="toggle-cybro-assistant"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--hair-06)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink)", margin: 0 }}>
                  CyBro AI Assistant (Floating Widget)
                </p>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    backgroundColor: showCyBro ? "rgba(16, 185, 129, 0.15)" : "rgba(100, 116, 139, 0.15)",
                    color: showCyBro ? "#10B981" : "var(--muted)",
                    border: `1px solid ${showCyBro ? "rgba(16, 185, 129, 0.3)" : "var(--hair-10)"}`,
                    padding: "1px 6px",
                    borderRadius: "10px",
                  }}
                >
                  {showCyBro ? "VISIBLE" : "HIDDEN"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.25rem 0 0 0" }}>
                Show or hide the interactive bottom-right floating CyBro avatar and quick cyber first-aid assistant.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleCyBro}
              aria-label="Toggle CyBro Assistant Visibility"
              style={{
                width: "40px",
                height: "22px",
                backgroundColor: showCyBro ? "var(--accent)" : "var(--hair-10)",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                transition: "background-color 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  backgroundColor: "#FFFFFF",
                  transform: showCyBro ? "translateX(18px)" : "translateX(0)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          </div>

          {/* ── Sub-Section: CyBro Avatar Persona & Skins (6 Variants) ── */}
          <div
            id="cybro-persona-skins"
            style={{
              paddingTop: "1.25rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid var(--hair-06)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Smile style={{ width: "15px", height: "15px", color: "var(--accent)" }} />
                <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", margin: 0 }}>
                  CyBro Avatar Personas & Chassis Skins (6 Custom Faces)
                </h3>
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    backgroundColor: "rgba(56, 189, 248, 0.15)",
                    color: "#38BDF8",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    padding: "1px 6px",
                    borderRadius: "10px",
                  }}
                >
                  REAL-TIME SYNC
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0.35rem 0 0 0" }}>
                Select your AI companion's visual chassis and personality. Equipping a skin updates the floating avatar and assistant everywhere across the dashboard!
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "0.85rem",
              }}
            >
              {CYBRO_SKINS.map((skin) => {
                const isSelected = selectedSkin === skin.id;
                return (
                  <div
                    key={skin.id}
                    onClick={() => handleSelectSkin(skin.id)}
                    style={{
                      padding: "1rem",
                      borderRadius: "12px",
                      backgroundColor: isSelected ? "var(--accent-subtle)" : "var(--ground-secondary)",
                      border: isSelected
                        ? `1.5px solid ${skin.accent}`
                        : "1px solid var(--hair-10)",
                      boxShadow: isSelected ? `0 4px 18px ${skin.accent}25` : "none",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                      transition: "all 0.2s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--hair-20)";
                        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--hair-10)";
                        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {/* Top Row: Mini Avatar + Tag */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div
                        style={{
                          width: "66px",
                          height: "66px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#030712",
                          borderRadius: "16px",
                          border: `1.5px solid ${skin.accent}50`,
                          boxShadow: `inset 0 0 12px ${skin.accent}15`,
                        }}
                      >
                        <CyBroAvatar size={54} skin={skin.id} mood={isSelected ? "happy" : "idle"} />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            padding: "2px 7px",
                            borderRadius: "6px",
                            backgroundColor: `${skin.accent}15`,
                            color: skin.accent,
                            border: `1px solid ${skin.accent}40`,
                          }}
                        >
                          {skin.tag}
                        </span>

                        <span
                          style={{
                            fontSize: "9px",
                            color: "var(--muted)",
                            fontFamily: "monospace",
                          }}
                        >
                          {skin.silhouette}
                        </span>

                        {isSelected && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              color: "var(--ok)",
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <Check style={{ width: "12px", height: "12px" }} /> Equipped
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div>
                      <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                        {skin.name}
                      </h4>
                      <p style={{ fontSize: "11.5px", color: "var(--muted)", margin: "0.25rem 0 0 0", lineHeight: 1.4 }}>
                        {skin.desc}
                      </p>
                    </div>

                    {/* Bottom action indicator */}
                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "0.5rem",
                        borderTop: "1px solid var(--hair-06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "11px",
                      }}
                    >
                      <span style={{ color: isSelected ? skin.accent : "var(--muted)", fontWeight: 500 }}>
                        {isSelected ? "Currently Active" : "Click to Equip"}
                      </span>
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: isSelected ? `2px solid ${skin.accent}` : "1.5px solid var(--hair-20)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected ? skin.accent : "transparent",
                        }}
                      >
                        {isSelected && <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#FFFFFF" }} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sensitivity options */}
          <div>
            <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--ink)", margin: "0 0 0.5rem 0" }}>
              Diagnostic Inspection Sensitivity
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
              {(["standard", "high", "paranoid"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSensitivity(lvl)}
                  style={{
                    padding: "0.75rem",
                    textAlign: "left",
                    backgroundColor: sensitivity === lvl ? "var(--accent-subtle)" : "var(--ground-secondary)",
                    border: sensitivity === lvl ? "1px solid var(--accent)" : "1px solid var(--hair-10)",
                    cursor: "pointer",
                  }}
                >
                  <p className="label" style={{ color: sensitivity === lvl ? "var(--accent)" : "var(--ink)", margin: 0 }}>
                    {lvl} Level
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0.25rem 0 0 0" }}>
                    {lvl === "standard" && "Balanced heuristics & low false positives."}
                    {lvl === "high" && "Multi-vector ML scoring & deep heuristic tree."}
                    {lvl === "paranoid" && "Maximum verification with zero heuristic bypass."}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          SECTION 3: CLUSTER NODE & ENCRYPTION PROFILE
          ────────────────────────────────────────────────────────── */}
      <div
        className="void-panel"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--hair-06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Cpu style={{ width: "14px", height: "14px", color: "var(--accent)" }} />
            <span className="label" style={{ color: "var(--ink)" }}>Cluster Infrastructure & Cryptography</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div style={{ padding: "1rem", backgroundColor: "var(--ground-secondary)", border: "1px solid var(--hair-06)" }}>
            <span className="label" style={{ color: "var(--muted)" }}>Cluster Node</span>
            <p style={{ fontSize: "13px", color: "var(--ink)", margin: "0.25rem 0 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
              LAX-01 (Primary)
            </p>
          </div>
          <div style={{ padding: "1rem", backgroundColor: "var(--ground-secondary)", border: "1px solid var(--hair-06)" }}>
            <span className="label" style={{ color: "var(--muted)" }}>Cipher Standard</span>
            <p style={{ fontSize: "13px", color: "var(--ink)", margin: "0.25rem 0 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
              AES-256-GCM / Post-Quantum
            </p>
          </div>
          <div style={{ padding: "1rem", backgroundColor: "var(--ground-secondary)", border: "1px solid var(--hair-06)" }}>
            <span className="label" style={{ color: "var(--muted)" }}>ML Diagnostic Engine</span>
            <p style={{ fontSize: "13px", color: "var(--ok)", margin: "0.25rem 0 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
              Online (Port 5001)
            </p>
          </div>
        </div>

        {/* Action Save Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "1rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={handleSavePreferences}
            className="btn-accent"
          >
            <Check style={{ width: "12px", height: "12px" }} />
            <span>Save Configurations</span>
          </button>
        </div>
      </div>
    </div>
  );
}
