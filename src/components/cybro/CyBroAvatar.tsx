"use client";

import { useEffect, useState, useRef } from "react";

export type CyBroMood = "idle" | "happy" | "angry" | "smug" | "thinking";
export type CyBroSkin = "classic" | "matrix" | "mecha" | "gold" | "phantom" | "kawaii";

export interface CyBroSkinInfo {
  id: CyBroSkin;
  name: string;
  tag: string;
  desc: string;
  accent: string;
  bgGradient: string;
}

export const CYBRO_SKINS: CyBroSkinInfo[] = [
  {
    id: "classic",
    name: "Classic Sentinel",
    tag: "DEFAULT",
    desc: "Iconic cyan cyber companion with OLED optics & dual cyber antennas",
    accent: "#38BDF8",
    bgGradient: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
  },
  {
    id: "matrix",
    name: "Neo Matrix Hacker",
    tag: "TERMINAL",
    desc: "Underground phosphor-green terminal hacker with code stream scanner",
    accent: "#22C55E",
    bgGradient: "linear-gradient(180deg, #052E16 0%, #022C22 100%)",
  },
  {
    id: "mecha",
    name: "Mecha Overlord",
    tag: "TACTICAL",
    desc: "Carbon obsidian chassis with sharp predator horns & ruby combat overdrive",
    accent: "#EF4444",
    bgGradient: "linear-gradient(180deg, #27272A 0%, #18181B 100%)",
  },
  {
    id: "gold",
    name: "Golden Sovereign",
    tag: "LUXURY",
    desc: "Polished obsidian chassis crowned with 24K gold cyber plating & solar optics",
    accent: "#F59E0B",
    bgGradient: "linear-gradient(180deg, #292524 0%, #1C1917 100%)",
  },
  {
    id: "phantom",
    name: "Ghost Spec-Ops",
    tag: "STEALTH",
    desc: "Covert reconnaissance chassis with ultraviolet spectral visor & stealth fins",
    accent: "#A855F7",
    bgGradient: "linear-gradient(180deg, #2E1065 0%, #0F0728 100%)",
  },
  {
    id: "kawaii",
    name: "Neko Cyberpunk",
    tag: "ANIME",
    desc: "Playful street-smart cyber kitten with glowing neon cat ears & pastel visor",
    accent: "#EC4899",
    bgGradient: "linear-gradient(180deg, #3B0764 0%, #1E112A 100%)",
  },
];

interface CyBroAvatarProps {
  size?: number; // width/height in px (default 56)
  mood?: CyBroMood;
  skin?: CyBroSkin;
  isHappy?: boolean;
  isAlert?: boolean;
}

export function CyBroAvatar({
  size = 56,
  mood,
  skin,
  isHappy = false,
  isAlert = false,
}: CyBroAvatarProps) {
  // Resolve effective mood
  const currentMood: CyBroMood =
    mood || (isAlert ? "angry" : isHappy ? "happy" : "idle");

  const [activeSkin, setActiveSkin] = useState<CyBroSkin>("classic");
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Sync skin from localStorage & custom event if not explicitly provided via prop
  useEffect(() => {
    if (skin) return;
    try {
      const saved = localStorage.getItem("sentinel_cybro_skin") as CyBroSkin;
      if (saved && CYBRO_SKINS.some((s) => s.id === saved)) {
        setActiveSkin(saved);
      }
    } catch {}

    const handleSkinChange = (e: Event) => {
      const customEvent = e as CustomEvent<CyBroSkin>;
      if (customEvent.detail && CYBRO_SKINS.some((s) => s.id === customEvent.detail)) {
        setActiveSkin(customEvent.detail);
      }
    };

    window.addEventListener("sentinel_cybro_skin_change", handleSkinChange);
    return () => window.removeEventListener("sentinel_cybro_skin_change", handleSkinChange);
  }, [skin]);

  const effectiveSkin = skin || activeSkin;

  // 1. Natural Blinking Loop
  useEffect(() => {
    if (currentMood === "happy" || currentMood === "angry") return;

    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 170);
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, [currentMood]);

  // 2. Mouse Tracking Eyes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!avatarRef.current) return;
      const rect = avatarRef.current.getBoundingClientRect();
      const avatarCenterX = rect.left + rect.width / 2;
      const avatarCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - avatarCenterX;
      const dy = e.clientY - avatarCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const maxDist = currentMood === "angry" ? 2.5 : 4.5;
      const factor = Math.min(dist / 200, 1) * maxDist;
      const targetX = (dx / dist) * factor;
      const targetY = (dy / dist) * factor;

      setPupilOffset({ x: targetX, y: targetY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [currentMood]);

  // Styling based on mood & skin
  const getThemeColors = () => {
    if (currentMood === "angry") {
      return {
        primary: "#EF4444",
        secondary: "#DC2626",
        glow: "0 0 16px rgba(239, 68, 68, 1)",
        border: "#EF4444",
        boxShadow: "0 0 24px rgba(239, 68, 68, 0.55)",
      };
    }
    if (currentMood === "happy") {
      return {
        primary: effectiveSkin === "kawaii" ? "#F472B6" : "#10B981",
        secondary: effectiveSkin === "kawaii" ? "#EC4899" : "#059669",
        glow: effectiveSkin === "kawaii" ? "0 0 16px rgba(244, 114, 182, 0.9)" : "0 0 14px rgba(16, 185, 129, 0.9)",
        border: effectiveSkin === "kawaii" ? "#F472B6" : "#10B981",
        boxShadow: effectiveSkin === "kawaii" ? "0 0 20px rgba(244, 114, 182, 0.45)" : "0 0 20px rgba(16, 185, 129, 0.4)",
      };
    }
    if (currentMood === "smug") {
      return {
        primary: "#F59E0B",
        secondary: "#D97706",
        glow: "0 0 12px rgba(245, 158, 11, 0.8)",
        border: "#F59E0B",
        boxShadow: "0 0 18px rgba(245, 158, 11, 0.35)",
      };
    }
    if (currentMood === "thinking") {
      return {
        primary: "#A855F7",
        secondary: "#9333EA",
        glow: "0 0 12px rgba(168, 85, 247, 0.8)",
        border: "#A855F7",
        boxShadow: "0 0 18px rgba(168, 85, 247, 0.35)",
      };
    }

    // Default: Skin-specific idle colors
    switch (effectiveSkin) {
      case "matrix":
        return {
          primary: "#22C55E",
          secondary: "#15803D",
          glow: "0 0 14px rgba(34, 197, 94, 0.9)",
          border: "#22C55E",
          boxShadow: "0 4px 18px rgba(34, 197, 94, 0.35)",
        };
      case "mecha":
        return {
          primary: "#F43F5E",
          secondary: "#BE123C",
          glow: "0 0 14px rgba(244, 63, 94, 0.9)",
          border: "#EF4444",
          boxShadow: "0 4px 18px rgba(239, 68, 68, 0.4)",
        };
      case "gold":
        return {
          primary: "#F59E0B",
          secondary: "#B45309",
          glow: "0 0 14px rgba(245, 158, 11, 0.9)",
          border: "#F59E0B",
          boxShadow: "0 4px 18px rgba(245, 158, 11, 0.4)",
        };
      case "phantom":
        return {
          primary: "#C084FC",
          secondary: "#7E22CE",
          glow: "0 0 14px rgba(192, 132, 252, 0.9)",
          border: "#A855F7",
          boxShadow: "0 4px 18px rgba(168, 85, 247, 0.4)",
        };
      case "kawaii":
        return {
          primary: "#F472B6",
          secondary: "#DB2777",
          glow: "0 0 14px rgba(244, 114, 182, 0.9)",
          border: "#EC4899",
          boxShadow: "0 4px 18px rgba(236, 72, 153, 0.4)",
        };
      case "classic":
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
  const skinInfo = CYBRO_SKINS.find((s) => s.id === effectiveSkin) || CYBRO_SKINS[0] || {
    id: "classic" as CyBroSkin,
    name: "Classic Sentinel",
    tag: "DEFAULT",
    desc: "",
    accent: "#38BDF8",
    bgGradient: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
  };

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

      {/* ── Skin Specific Ears & Top Crest ── */}
      {effectiveSkin === "kawaii" ? (
        /* Cute Triangular Cat Ears for Kawaii */
        <>
          <div
            style={{
              position: "absolute",
              top: "-8px",
              left: "6px",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: `10px solid ${theme.primary}`,
              transform: "rotate(-18deg)",
              filter: `drop-shadow(0 0 5px ${theme.primary})`,
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-8px",
              right: "6px",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: `10px solid ${theme.primary}`,
              transform: "rotate(18deg)",
              filter: `drop-shadow(0 0 5px ${theme.primary})`,
              zIndex: 1,
            }}
          />
        </>
      ) : effectiveSkin === "mecha" ? (
        /* Sharp Combat Mecha Horns */
        <>
          <div
            style={{
              position: "absolute",
              top: "-8px",
              left: "4px",
              width: "4px",
              height: "14px",
              backgroundColor: theme.primary,
              borderRadius: "1px",
              transform: "rotate(-32deg)",
              boxShadow: theme.glow,
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-8px",
              right: "4px",
              width: "4px",
              height: "14px",
              backgroundColor: theme.primary,
              borderRadius: "1px",
              transform: "rotate(32deg)",
              boxShadow: theme.glow,
              zIndex: 1,
            }}
          />
        </>
      ) : effectiveSkin === "gold" ? (
        /* Regal 3-Prong Gold Crown Crest */
        <div
          style={{
            position: "absolute",
            top: "-7px",
            display: "flex",
            gap: "2px",
            alignItems: "flex-end",
            zIndex: 1,
          }}
        >
          <div style={{ width: "3px", height: "5px", backgroundColor: "#F59E0B", borderRadius: "1px" }} />
          <div style={{ width: "4px", height: "8px", backgroundColor: "#FDE68A", borderRadius: "1px", boxShadow: "0 0 8px #F59E0B" }} />
          <div style={{ width: "3px", height: "5px", backgroundColor: "#F59E0B", borderRadius: "1px" }} />
        </div>
      ) : effectiveSkin === "phantom" ? (
        /* Spec-Ops Stealth Fins */
        <>
          <div
            style={{
              position: "absolute",
              left: "-6px",
              top: "32%",
              width: "5px",
              height: "17px",
              backgroundColor: theme.primary,
              borderRadius: "3px 0 0 6px",
              boxShadow: theme.glow,
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "-6px",
              top: "32%",
              width: "5px",
              height: "17px",
              backgroundColor: theme.primary,
              borderRadius: "0 3px 6px 0",
              boxShadow: theme.glow,
              opacity: 0.9,
            }}
          />
        </>
      ) : effectiveSkin === "matrix" ? (
        /* Matrix Twin Signal Dipoles */
        <>
          <div
            style={{
              position: "absolute",
              left: "-4px",
              top: "35%",
              width: "3px",
              height: "15px",
              backgroundColor: "#22C55E",
              borderRadius: "2px",
              boxShadow: "0 0 8px #22C55E",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "-4px",
              top: "35%",
              width: "3px",
              height: "15px",
              backgroundColor: "#22C55E",
              borderRadius: "2px",
              boxShadow: "0 0 8px #22C55E",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-5px",
              width: "4px",
              height: "6px",
              backgroundColor: "#4ADE80",
              borderRadius: "2px",
              boxShadow: "0 0 8px #4ADE80",
            }}
          />
        </>
      ) : (
        /* Classic Sentinel Ears & Beacon */
        <>
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
        </>
      )}

      {/* ── Robot Head Capsule ── */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: skinInfo.bgGradient,
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
            background: "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 100%)",
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
              <div
                style={{
                  width: "11px",
                  height: "2.5px",
                  backgroundColor: "#F59E0B",
                  borderRadius: "2px",
                  transform: "translateY(1px) rotate(-5deg)",
                  boxShadow: theme.glow,
                }}
              />
            </div>
          )}

          {/* ── Eyes Container ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: currentMood === "angry" || currentMood === "smug" ? "4px" : "0",
            }}
          >
            {/* Left Eye */}
            {currentMood === "happy" ? (
              <div
                style={{
                  width: "10px",
                  height: "5px",
                  borderTop: `2.5px solid ${theme.primary}`,
                  borderRadius: "10px 10px 0 0",
                  boxShadow: theme.glow,
                  transform: "translateY(-1px)",
                }}
              />
            ) : currentMood === "smug" ? (
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

            {/* Right Eye */}
            {currentMood === "happy" ? (
              <div
                style={{
                  width: "10px",
                  height: "5px",
                  borderTop: `2.5px solid ${theme.primary}`,
                  borderRadius: "10px 10px 0 0",
                  boxShadow: theme.glow,
                  transform: "translateY(-1px)",
                }}
              />
            ) : currentMood === "smug" ? (
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
