"use client";

import { useEffect, useState, useRef } from "react";

export type CyBroMood = "idle" | "happy" | "angry" | "smug" | "thinking";

interface CyBroAvatarProps {
  size?: number; // width/height in px (default 56)
  mood?: CyBroMood;
  isHappy?: boolean;
  isAlert?: boolean;
}

export function CyBroAvatar({
  size = 56,
  mood,
  isHappy = false,
  isAlert = false,
}: CyBroAvatarProps) {
  // Resolve effective mood
  const currentMood: CyBroMood =
    mood || (isAlert ? "angry" : isHappy ? "happy" : "idle");

  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // 1. Natural Blinking Loop (Only blinks when idle or smug; happy & angry keep their facial hold)
  useEffect(() => {
    if (currentMood === "happy" || currentMood === "angry") return;

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 170);
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, [currentMood]);

  // 2. Mouse Tracking Eyes (Active in idle, smug, and thinking)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!avatarRef.current) return;
      const rect = avatarRef.current.getBoundingClientRect();
      const avatarCenterX = rect.left + rect.width / 2;
      const avatarCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - avatarCenterX;
      const dy = e.clientY - avatarCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Max eye travel limit: 4px
      const maxDist = currentMood === "angry" ? 2.5 : 4.5;
      const factor = Math.min(dist / 200, 1) * maxDist;
      const targetX = (dx / dist) * factor;
      const targetY = (dy / dist) * factor;

      setPupilOffset({ x: targetX, y: targetY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [currentMood]);

  // Styling based on mood
  const getThemeColors = () => {
    switch (currentMood) {
      case "happy":
        return {
          primary: "#10B981",
          secondary: "#059669",
          glow: "0 0 14px rgba(16, 185, 129, 0.9)",
          border: "#10B981",
          boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
        };
      case "angry":
        return {
          primary: "#EF4444",
          secondary: "#DC2626",
          glow: "0 0 16px rgba(239, 68, 68, 1)",
          border: "#EF4444",
          boxShadow: "0 0 24px rgba(239, 68, 68, 0.55)",
        };
      case "smug":
        return {
          primary: "#F59E0B",
          secondary: "#D97706",
          glow: "0 0 12px rgba(245, 158, 11, 0.8)",
          border: "#F59E0B",
          boxShadow: "0 0 18px rgba(245, 158, 11, 0.35)",
        };
      case "thinking":
        return {
          primary: "#A855F7",
          secondary: "#9333EA",
          glow: "0 0 12px rgba(168, 85, 247, 0.8)",
          border: "#A855F7",
          boxShadow: "0 0 18px rgba(168, 85, 247, 0.35)",
        };
      case "idle":
      default:
        return {
          primary: "#38BDF8",
          secondary: "#0284C7",
          glow: "0 0 10px rgba(56, 189, 248, 0.8)",
          border: "#38BDF8",
          boxShadow: "0 4px 16px rgba(56, 189, 248, 0.25)",
        };
    }
  };

  const theme = getThemeColors();

  return (
    <div
      ref={avatarRef}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        animation:
          currentMood === "happy"
            ? "cybroHappyBounce 1.4s ease-in-out infinite"
            : currentMood === "angry"
            ? "cybroAngryShake 0.45s ease-in-out infinite"
            : undefined,
      }}
    >
      <style>{`
        @keyframes cybroHappyBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px) scale(1.02); }
        }
        @keyframes cybroAngryShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }
        @keyframes antennaPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes thinkingScan {
          0%, 100% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
        }
      `}</style>

      {/* ── Left Cyber Ear Antenna ── */}
      <div
        style={{
          position: "absolute",
          left: "-4px",
          top: "38%",
          width: "4px",
          height: "13px",
          backgroundColor: "#1E293B",
          borderRadius: "2px",
          border: `1px solid ${theme.primary}`,
          boxShadow: theme.glow,
          animation: currentMood === "angry" ? "antennaPulse 0.3s ease infinite" : undefined,
        }}
      />

      {/* ── Right Cyber Ear Antenna ── */}
      <div
        style={{
          position: "absolute",
          right: "-4px",
          top: "38%",
          width: "4px",
          height: "13px",
          backgroundColor: "#1E293B",
          borderRadius: "2px",
          border: `1px solid ${theme.primary}`,
          boxShadow: theme.glow,
          animation: currentMood === "angry" ? "antennaPulse 0.3s ease infinite" : undefined,
        }}
      />

      {/* ── Head Top Antenna Beacon ── */}
      <div
        style={{
          position: "absolute",
          top: "-5px",
          width: "4px",
          height: "5px",
          backgroundColor: theme.primary,
          borderRadius: "2px 2px 0 0",
          boxShadow: theme.glow,
        }}
      />

      {/* ── Robot Head Capsule ── */}
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#0F172A",
          borderRadius: "18px",
          border: `2px solid ${theme.border}`,
          boxShadow: theme.boxShadow,
          padding: "5px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glossy Screen Glare */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "45%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)",
            borderRadius: "14px 14px 0 0",
            pointerEvents: "none",
          }}
        />

        {/* ── OLED Eye Visor ── */}
        <div
          style={{
            width: "88%",
            height: "72%",
            backgroundColor: "#030712",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.85)",
            position: "relative",
            padding: "2px",
          }}
        >
          {/* Eyebrows Layer for Angry or Smug */}
          {currentMood === "angry" && (
            <div
              style={{
                position: "absolute",
                top: "5px",
                width: "72%",
                display: "flex",
                justifyContent: "space-between",
                padding: "0 2px",
              }}
            >
              <div
                style={{
                  width: "11px",
                  height: "2.5px",
                  backgroundColor: "#EF4444",
                  borderRadius: "2px",
                  transform: "rotate(26deg)",
                  boxShadow: theme.glow,
                }}
              />
              <div
                style={{
                  width: "11px",
                  height: "2.5px",
                  backgroundColor: "#EF4444",
                  borderRadius: "2px",
                  transform: "rotate(-26deg)",
                  boxShadow: theme.glow,
                }}
              />
            </div>
          )}

          {currentMood === "smug" && (
            <div
              style={{
                position: "absolute",
                top: "5px",
                width: "72%",
                display: "flex",
                justifyContent: "space-between",
                padding: "0 2px",
              }}
            >
              {/* Left raised brow */}
              <div
                style={{
                  width: "11px",
                  height: "2.5px",
                  backgroundColor: "#F59E0B",
                  borderRadius: "2px",
                  transform: "translateY(-2px) rotate(-10deg)",
                  boxShadow: theme.glow,
                }}
              />
              {/* Right relaxed brow */}
              <div
                style={{
                  width: "10px",
                  height: "2px",
                  backgroundColor: "#F59E0B",
                  borderRadius: "2px",
                  transform: "translateY(0px)",
                  boxShadow: theme.glow,
                }}
              />
            </div>
          )}

          {/* ── Eyes Row ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: currentMood === "angry" ? "4px" : "1px",
            }}
          >
            {/* ── Left Eye ── */}
            {currentMood === "happy" ? (
              // Happy Smiling Arch ^
              <div
                style={{
                  width: "12px",
                  height: "8px",
                  borderTop: `3px solid ${theme.primary}`,
                  borderLeft: `2px solid ${theme.primary}`,
                  borderRight: `2px solid ${theme.primary}`,
                  borderRadius: "10px 10px 0 0",
                  boxShadow: theme.glow,
                }}
              />
            ) : currentMood === "smug" ? (
              // Smug wide left eye
              <div
                style={{
                  width: "11px",
                  height: isBlinking ? "2px" : "13px",
                  backgroundColor: theme.primary,
                  borderRadius: "5px",
                  boxShadow: theme.glow,
                  transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
                  transition: "transform 0.08s ease-out, height 0.12s ease",
                }}
              />
            ) : currentMood === "thinking" ? (
              // Thinking scanner eye
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  backgroundColor: theme.primary,
                  borderRadius: "50%",
                  boxShadow: theme.glow,
                  animation: "thinkingScan 0.8s ease-in-out infinite",
                }}
              />
            ) : (
              // Standard or Angry eye
              <div
                style={{
                  width: currentMood === "angry" ? "10px" : "11px",
                  height: isBlinking ? "2px" : currentMood === "angry" ? "10px" : "13px",
                  backgroundColor: theme.primary,
                  borderRadius: currentMood === "angry" ? "2px" : "5px",
                  boxShadow: theme.glow,
                  transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
                  transition: isBlinking
                    ? "height 0.08s ease"
                    : "transform 0.08s ease-out, height 0.15s ease",
                }}
              />
            )}

            {/* ── Right Eye ── */}
            {currentMood === "happy" ? (
              // Happy Smiling Arch ^
              <div
                style={{
                  width: "12px",
                  height: "8px",
                  borderTop: `3px solid ${theme.primary}`,
                  borderLeft: `2px solid ${theme.primary}`,
                  borderRight: `2px solid ${theme.primary}`,
                  borderRadius: "10px 10px 0 0",
                  boxShadow: theme.glow,
                }}
              />
            ) : currentMood === "smug" ? (
              // Smug half-squint right eye (winking/judging)
              <div
                style={{
                  width: "10px",
                  height: "5px",
                  backgroundColor: theme.primary,
                  borderRadius: "3px",
                  boxShadow: theme.glow,
                  transform: `translate(${pupilOffset.x}px, 2px)`,
                }}
              />
            ) : currentMood === "thinking" ? (
              // Thinking scanner eye
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  backgroundColor: theme.primary,
                  borderRadius: "50%",
                  boxShadow: theme.glow,
                  animation: "thinkingScan 0.8s ease-in-out infinite",
                }}
              />
            ) : (
              // Standard or Angry eye
              <div
                style={{
                  width: currentMood === "angry" ? "10px" : "11px",
                  height: isBlinking ? "2px" : currentMood === "angry" ? "10px" : "13px",
                  backgroundColor: theme.primary,
                  borderRadius: currentMood === "angry" ? "2px" : "5px",
                  boxShadow: theme.glow,
                  transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
                  transition: isBlinking
                    ? "height 0.08s ease"
                    : "transform 0.08s ease-out, height 0.15s ease",
                }}
              />
            )}
          </div>

          {/* ── Happy Blushing Cheeks ── */}
          {currentMood === "happy" && (
            <div
              style={{
                position: "absolute",
                bottom: "4px",
                width: "75%",
                display: "flex",
                justifyContent: "space-between",
                padding: "0 2px",
              }}
            >
              <div
                style={{
                  width: "6px",
                  height: "3px",
                  backgroundColor: "#F43F5E",
                  borderRadius: "50%",
                  boxShadow: "0 0 6px #F43F5E",
                }}
              />
              <div
                style={{
                  width: "6px",
                  height: "3px",
                  backgroundColor: "#F43F5E",
                  borderRadius: "50%",
                  boxShadow: "0 0 6px #F43F5E",
                }}
              />
            </div>
          )}

          {/* ── Mouth / Expression Line ── */}
          {currentMood === "happy" && (
            <div
              style={{
                width: "10px",
                height: "5px",
                borderBottom: `2px solid ${theme.primary}`,
                borderRadius: "0 0 10px 10px",
                marginTop: "3px",
              }}
            />
          )}

          {currentMood === "angry" && (
            <div
              style={{
                width: "9px",
                height: "2px",
                backgroundColor: "#EF4444",
                borderRadius: "1px",
                marginTop: "4px",
                boxShadow: theme.glow,
              }}
            />
          )}

          {currentMood === "smug" && (
            // Smug diagonal smirk
            <div
              style={{
                width: "8px",
                height: "2px",
                backgroundColor: "#F59E0B",
                transform: "rotate(14deg) translateX(2px)",
                borderRadius: "1px",
                marginTop: "3px",
                boxShadow: theme.glow,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
