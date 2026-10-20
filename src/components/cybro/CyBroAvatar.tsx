"use client";

import { useEffect, useState, useRef } from "react";

export type CyBroMood = "idle" | "happy" | "angry" | "smug" | "thinking";
export type CyBroSkin = "classic" | "matrix" | "mecha" | "gold" | "kawaii" | "phantom";

export interface CyBroSkinInfo {
  id: CyBroSkin;
  name: string;
  tag: string;
  desc: string;
  accent: string;
  silhouette: string;
}

export const CYBRO_SKINS: CyBroSkinInfo[] = [
  {
    id: "classic",
    name: "Classic Astro Bot",
    tag: "RETRO BOT",
    desc: "Rounded TV-head with OLED pill eyes & glowing beacon antenna",
    accent: "#38BDF8",
    silhouette: "TV-Head Capsule",
  },
  {
    id: "matrix",
    name: "Neo Matrix Hacker",
    tag: "CYBERPUNK",
    desc: "Hexagonal skull chassis with sweeping terminal visor beam & twin dipoles",
    accent: "#22C55E",
    silhouette: "Hex Skull Visor",
  },
  {
    id: "mecha",
    name: "Mecha Overlord",
    tag: "GUNDAM TITAN",
    desc: "Titan combat armor with iconic golden V-Fin horns & predator slit optics",
    accent: "#EF4444",
    silhouette: "V-Fin Combat Armor",
  },
  {
    id: "gold",
    name: "Golden Sovereign",
    tag: "CYCLOPS LUXURY",
    desc: "24K gold halo dome featuring a high-tech aperture cyclops lens",
    accent: "#F59E0B",
    silhouette: "Pharaoh Cyclops Core",
  },
  {
    id: "kawaii",
    name: "Neko Cyberpunk",
    tag: "CHIBI CAT",
    desc: "Chibi cat bot with glowing triangular Neko ears, anime star eyes & :3 mouth",
    accent: "#EC4899",
    silhouette: "Tri-Cat Chibi Ears",
  },
  {
    id: "phantom",
    name: "Ghost Spec-Ops",
    tag: "TRI-EYE STEALTH",
    desc: "Covert aerodynamic stealth drone with 3 tactical ultraviolet sensor optics",
    accent: "#A855F7",
    silhouette: "Tri-Sensor Stealth",
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
      setTimeout(() => setIsBlinking(false), 160);
    }, 3600);

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

      const maxDist = currentMood === "angry" ? 3 : 5.5;
      const factor = Math.min(dist / 220, 1) * maxDist;
      const targetX = (dx / dist) * factor;
      const targetY = (dy / dist) * factor;

      setPupilOffset({ x: targetX, y: targetY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [currentMood]);

  // Skin color presets
  const getColors = () => {
    if (currentMood === "angry") {
      return {
        glow: "#EF4444",
        eye: "#EF4444",
        accent: "#EF4444",
        border: "#EF4444",
      };
    }
    if (currentMood === "happy") {
      const happyAccent = effectiveSkin === "kawaii" ? "#F472B6" : "#10B981";
      return {
        glow: happyAccent,
        eye: happyAccent,
        accent: happyAccent,
        border: happyAccent,
      };
    }

    switch (effectiveSkin) {
      case "matrix":
        return { glow: "#22C55E", eye: "#4ADE80", accent: "#22C55E", border: "#16A34A" };
      case "mecha":
        return { glow: "#EF4444", eye: "#F43F5E", accent: "#F97316", border: "#DC2626" };
      case "gold":
        return { glow: "#F59E0B", eye: "#FDE68A", accent: "#F59E0B", border: "#D97706" };
      case "phantom":
        return { glow: "#A855F7", eye: "#C084FC", accent: "#A855F7", border: "#7E22CE" };
      case "kawaii":
        return { glow: "#EC4899", eye: "#F472B6", accent: "#EC4899", border: "#DB2777" };
      case "classic":
      default:
        return { glow: "#38BDF8", eye: "#38BDF8", accent: "#38BDF8", border: "#0284C7" };
    }
  };

  const colors = getColors();
  const px = pupilOffset.x;
  const py = pupilOffset.y;

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
            ? "avatarBounce 1.4s ease-in-out infinite"
            : currentMood === "angry"
            ? "avatarShake 0.45s ease-in-out infinite"
            : undefined,
        filter: `drop-shadow(0 0 12px ${colors.glow}40)`,
      }}
    >
      <style>{`
        @keyframes avatarBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3.5px) scale(1.02); }
        }
        @keyframes avatarShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }
        @keyframes matrixScan {
          0% { transform: translateX(-20px); opacity: 0.3; }
          50% { opacity: 1; }
          100% { transform: translateX(20px); opacity: 0.3; }
        }
        @keyframes cyclopsPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes earPulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════
          CHARACTER 1: CLASSIC ASTRO BOT (TV-Head Retro Robot)
          ════════════════════════════════════════════════════════════ */}
      {effectiveSkin === "classic" && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="classic-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0B132B" />
            </linearGradient>
            <linearGradient id="classic-visor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>

          {/* Top Antenna Beacon */}
          <line x1="50" y1="20" x2="50" y2="7" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="6" r="4.5" fill="#38BDF8" filter={`drop-shadow(0 0 6px ${colors.glow})`} />

          {/* Ear Bolts */}
          <rect x="7" y="44" width="6" height="16" rx="2" fill="#334155" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="87" y="44" width="6" height="16" rx="2" fill="#334155" stroke="#38BDF8" strokeWidth="1.5" />

          {/* Head Chassis */}
          <rect x="13" y="20" width="74" height="68" rx="18" fill="url(#classic-bg)" stroke="#38BDF8" strokeWidth="2.5" />

          {/* Visor Screen */}
          <rect x="20" y="27" width="60" height="42" rx="12" fill="url(#classic-visor)" stroke="rgba(56,189,248,0.3)" strokeWidth="1.5" />

          {/* Eyes (Tracking + Blinking) */}
          {currentMood === "happy" ? (
            <g stroke={colors.eye} strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M 31 46 Q 38 38 45 46" />
              <path d="M 55 46 Q 62 38 69 46" />
            </g>
          ) : (
            <g fill={colors.eye} filter={`drop-shadow(0 0 5px ${colors.glow})`}>
              {/* Left Eye */}
              <rect
                x={32 + px}
                y={isBlinking ? 46 : 39 + py}
                width="12"
                height={isBlinking ? "2.5" : currentMood === "angry" ? "10" : "15"}
                rx={isBlinking ? "1" : "5"}
              />
              {/* Right Eye */}
              <rect
                x={56 + px}
                y={isBlinking ? 46 : 39 + py}
                width="12"
                height={isBlinking ? "2.5" : currentMood === "angry" ? "10" : "15"}
                rx={isBlinking ? "1" : "5"}
              />
            </g>
          )}

          {/* Blushing Cheeks when Happy */}
          {currentMood === "happy" && (
            <g fill="#F43F5E" opacity="0.85">
              <ellipse cx="28" cy="56" rx="4" ry="2" />
              <ellipse cx="72" cy="56" rx="4" ry="2" />
            </g>
          )}

          {/* Speaker grill / mouth */}
          <line x1="42" y1="77" x2="58" y2="77" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <line x1="45" y1="81" x2="55" y2="81" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      )}

      {/* ════════════════════════════════════════════════════════════
          CHARACTER 2: NEO MATRIX HACKER (Faceted Hex-Skull Drone)
          ════════════════════════════════════════════════════════════ */}
      {effectiveSkin === "matrix" && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="matrix-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#052E16" />
              <stop offset="100%" stopColor="#021C14" />
            </linearGradient>
            <linearGradient id="matrix-beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Twin Corner Antenna Spikes */}
          <line x1="20" y1="28" x2="10" y2="10" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="10" cy="10" r="3" fill="#4ADE80" filter="drop-shadow(0 0 6px #22C55E)" />

          <line x1="80" y1="28" x2="90" y2="10" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="90" cy="10" r="3" fill="#4ADE80" filter="drop-shadow(0 0 6px #22C55E)" />

          {/* Hexagonal Skull Chassis */}
          <polygon
            points="50,14 84,28 82,74 50,92 18,74 16,28"
            fill="url(#matrix-bg)"
            stroke="#22C55E"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Matrix Circuit Lines on Temples */}
          <polyline points="24,36 30,36 34,42" fill="none" stroke="#15803D" strokeWidth="1.5" />
          <polyline points="76,36 70,36 66,42" fill="none" stroke="#15803D" strokeWidth="1.5" />

          {/* Continuous Hacker Visor Band */}
          <polygon
            points="22,44 78,44 75,60 50,65 25,60"
            fill="#030A06"
            stroke="#22C55E"
            strokeWidth="1.5"
          />

          {/* Sweeping Laser Radar Beam */}
          <rect
            x={40 + px * 2}
            y="47"
            width="20"
            height="12"
            fill="url(#matrix-beam)"
            style={{ animation: "matrixScan 1.6s ease-in-out infinite" }}
          />

          {/* Dual Cyber Optic Dots */}
          <circle cx={36 + px} cy={53 + py} r={isBlinking ? 1 : 3.5} fill="#4ADE80" filter="drop-shadow(0 0 6px #4ADE80)" />
          <circle cx={64 + px} cy={53 + py} r={isBlinking ? 1 : 3.5} fill="#4ADE80" filter="drop-shadow(0 0 6px #4ADE80)" />

          {/* Cyber Chin Hash */}
          <rect x="42" y="76" width="16" height="3" fill="#22C55E" opacity="0.6" />
          <rect x="46" y="82" width="8" height="2" fill="#22C55E" opacity="0.4" />
        </svg>
      )}

      {/* ════════════════════════════════════════════════════════════
          CHARACTER 3: MECHA OVERLORD (Gundam Combat Overdrive Armor)
          ════════════════════════════════════════════════════════════ */}
      {effectiveSkin === "mecha" && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="mecha-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#27272A" />
              <stop offset="100%" stopColor="#18181B" />
            </linearGradient>
            <linearGradient id="v-fin-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>

          {/* Giant Gundam V-Fin Horns */}
          <polygon
            points="50,30 22,6 30,5 50,22 70,5 78,6"
            fill="url(#v-fin-gold)"
            stroke="#B45309"
            strokeWidth="1.2"
            filter="drop-shadow(0 2px 8px rgba(245, 158, 11, 0.6))"
          />
          {/* Red Central V-Fin Gem */}
          <polygon points="50,18 46,26 50,30 54,26" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />

          {/* Angular Armor Helmet Chassis */}
          <polygon
            points="50,24 84,36 80,78 68,90 32,90 20,78 16,36"
            fill="url(#mecha-bg)"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Cheek Armor Guards */}
          <polygon points="16,45 28,48 24,72 16,66" fill="#3F3F46" stroke="#EF4444" strokeWidth="1" />
          <polygon points="84,45 72,48 76,72 84,66" fill="#3F3F46" stroke="#EF4444" strokeWidth="1" />

          {/* Slit Visor Cavity */}
          <polygon points="28,48 72,48 68,62 50,66 32,62" fill="#09090B" />

          {/* Predator Angular Slit Eyes (Angry Combat Optics) */}
          {currentMood === "happy" ? (
            <g stroke="#10B981" strokeWidth="3" fill="none">
              <path d="M 33 54 L 43 51" />
              <path d="M 67 54 L 57 51" />
            </g>
          ) : (
            <g fill="#EF4444" filter="drop-shadow(0 0 6px #EF4444)">
              {/* Left Slit */}
              <polygon
                points={`${32 + px},${52 + py} ${44 + px},${56 + py} ${43 + px},${isBlinking ? 53 + py : 59 + py} ${32 + px},${isBlinking ? 53 + py : 55 + py}`}
              />
              {/* Right Slit */}
              <polygon
                points={`${68 + px},${52 + py} ${56 + px},${56 + py} ${57 + px},${isBlinking ? 53 + py : 59 + py} ${68 + px},${isBlinking ? 53 + py : 55 + py}`}
              />
            </g>
          )}

          {/* Mecha Combat Air Vent Slits on Faceplate */}
          <line x1="42" y1="74" x2="58" y2="74" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          <line x1="44" y1="79" x2="56" y2="79" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="46" y1="84" x2="54" y2="84" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      {/* ════════════════════════════════════════════════════════════
          CHARACTER 4: GOLDEN SOVEREIGN (Royal Pharaoh / Cyclops Core)
          ════════════════════════════════════════════════════════════ */}
      {effectiveSkin === "gold" && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="gold-dome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2A2008" />
              <stop offset="100%" stopColor="#140F04" />
            </linearGradient>
            <linearGradient id="gold-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
          </defs>

          {/* Royal Sun Halo Crown */}
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#gold-metal)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />

          {/* Top Royal Crest */}
          <polygon points="50,6 44,18 56,18" fill="url(#gold-metal)" filter="drop-shadow(0 0 8px #F59E0B)" />

          {/* Dome Head Chassis */}
          <rect
            x="16"
            y="18"
            width="68"
            height="70"
            rx="34"
            fill="url(#gold-dome)"
            stroke="url(#gold-metal)"
            strokeWidth="2.8"
          />

          {/* Side Gilded Filigree Bars */}
          <line x1="12" y1="45" x2="12" y2="60" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
          <line x1="88" y1="45" x2="88" y2="60" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />

          {/* Central Cyclops Core Ring (HAL 9000 / Portal Core) */}
          <circle cx="50" cy="52" r="22" fill="#030712" stroke="url(#gold-metal)" strokeWidth="2.5" />
          <circle cx="50" cy="52" r="16" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 2" />

          {/* Cyclops Aperture Eye with Concentric Halo */}
          <circle
            cx={50 + px * 1.4}
            cy={52 + py * 1.4}
            r={isBlinking ? 2 : 10}
            fill="#F59E0B"
            filter="drop-shadow(0 0 10px #F59E0B)"
            style={{ animation: "cyclopsPulse 2s ease-in-out infinite" }}
          />
          <circle
            cx={50 + px * 1.4}
            cy={52 + py * 1.4}
            r={isBlinking ? 1 : 4}
            fill="#FFFBEB"
          />

          {/* Sovereign Golden Chin Ingot */}
          <rect x="42" y="78" width="16" height="4" rx="2" fill="url(#gold-metal)" />
        </svg>
      )}

      {/* ════════════════════════════════════════════════════════════
          CHARACTER 5: NEKO CYBERPUNK (Cute Anime Catbot with Tri-Ears)
          ════════════════════════════════════════════════════════════ */}
      {effectiveSkin === "kawaii" && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="neko-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E1035" />
              <stop offset="100%" stopColor="#14061A" />
            </linearGradient>
            <linearGradient id="neko-ear-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="100%" stopColor="#BE185D" />
            </linearGradient>
          </defs>

          {/* Left Cat Ear (Outer + Inner Glow Pad) */}
          <polygon
            points="14,35 6,5 38,18"
            fill="url(#neko-bg)"
            stroke="#EC4899"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="16,30 11,10 32,19"
            fill="url(#neko-ear-glow)"
            style={{ animation: "earPulse 2s ease-in-out infinite" }}
            filter="drop-shadow(0 0 6px #EC4899)"
          />

          {/* Right Cat Ear (Outer + Inner Glow Pad) */}
          <polygon
            points="86,35 94,5 62,18"
            fill="url(#neko-bg)"
            stroke="#EC4899"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon
            points="84,30 89,10 68,19"
            fill="url(#neko-ear-glow)"
            style={{ animation: "earPulse 2s ease-in-out infinite" }}
            filter="drop-shadow(0 0 6px #EC4899)"
          />

          {/* Round Chibi Cat Head Chassis */}
          <rect
            x="14"
            y="20"
            width="72"
            height="66"
            rx="26"
            fill="url(#neko-bg)"
            stroke="#EC4899"
            strokeWidth="2.5"
          />

          {/* Visor Area */}
          <rect x="20" y="27" width="60" height="40" rx="18" fill="#0A020F" stroke="rgba(236,72,153,0.3)" strokeWidth="1.2" />

          {/* Big Chibi Anime Eyes with Twinkles */}
          {currentMood === "happy" ? (
            <g stroke="#F472B6" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M 30 46 Q 37 38 44 46" />
              <path d="M 56 46 Q 63 38 70 46" />
            </g>
          ) : (
            <g>
              {/* Left Eye */}
              <ellipse
                cx={37 + px}
                cy={45 + py}
                rx={isBlinking ? 6 : 7}
                ry={isBlinking ? 1 : 9}
                fill="#F472B6"
                filter="drop-shadow(0 0 6px #EC4899)"
              />
              {!isBlinking && <circle cx={35 + px} cy={42 + py} r="2.5" fill="#FFFFFF" />}

              {/* Right Eye */}
              <ellipse
                cx={63 + px}
                cy={45 + py}
                rx={isBlinking ? 6 : 7}
                ry={isBlinking ? 1 : 9}
                fill="#F472B6"
                filter="drop-shadow(0 0 6px #EC4899)"
              />
              {!isBlinking && <circle cx={61 + px} cy={42 + py} r="2.5" fill="#FFFFFF" />}
            </g>
          )}

          {/* Cheerful Blushing Pink Cheeks */}
          <ellipse cx="26" cy="54" rx="4.5" ry="2.5" fill="#F43F5E" opacity="0.9" filter="drop-shadow(0 0 4px #F43F5E)" />
          <ellipse cx="74" cy="54" rx="4.5" ry="2.5" fill="#F43F5E" opacity="0.9" filter="drop-shadow(0 0 4px #F43F5E)" />

          {/* Anime Cute :3 Cat Mouth */}
          <path
            d="M 44 56 Q 47 60 50 56 Q 53 60 56 56"
            fill="none"
            stroke="#F472B6"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Cyber Whiskers */}
          <line x1="8" y1="48" x2="16" y2="50" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <line x1="8" y1="54" x2="16" y2="54" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <line x1="92" y1="48" x2="84" y2="50" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <line x1="92" y1="54" x2="84" y2="54" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        </svg>
      )}

      {/* ════════════════════════════════════════════════════════════
          CHARACTER 6: GHOST SPEC-OPS (Tri-Eye Stealth Drone)
          ════════════════════════════════════════════════════════════ */}
      {effectiveSkin === "phantom" && (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="phantom-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E0B36" />
              <stop offset="100%" stopColor="#0B0314" />
            </linearGradient>
          </defs>

          {/* Swept-Back Stealth Recon Fins */}
          <polygon points="12,38 2,52 14,56" fill="#1E0B36" stroke="#A855F7" strokeWidth="1.8" />
          <polygon points="88,38 98,52 86,56" fill="#1E0B36" stroke="#A855F7" strokeWidth="1.8" />

          {/* Stealth Teardrop Helmet Chassis */}
          <polygon
            points="50,14 84,32 76,82 50,92 24,82 16,32"
            fill="url(#phantom-bg)"
            stroke="#A855F7"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Spec-Ops Holographic Facial Seams */}
          <line x1="50" y1="14" x2="50" y2="30" stroke="#7E22CE" strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="28" y1="78" x2="50" y2="88" stroke="#7E22CE" strokeWidth="1.5" />
          <line x1="72" y1="78" x2="50" y2="88" stroke="#7E22CE" strokeWidth="1.5" />

          {/* ── TRI-EYE SENSOR ARRAY (3 Tactical Optics in Triangle) ── */}
          <g filter="drop-shadow(0 0 7px #A855F7)">
            {/* Top Center Optic Lens */}
            <circle cx={50 + px * 0.9} cy={38 + py * 0.9} r={isBlinking ? 2 : 5} fill="#C084FC" stroke="#A855F7" strokeWidth="1.5" />
            <circle cx={50 + px * 0.9} cy={38 + py * 0.9} r="1.5" fill="#FFFFFF" />

            {/* Bottom-Left Optic Lens */}
            <circle cx={38 + px * 0.9} cy={54 + py * 0.9} r={isBlinking ? 2 : 6} fill="#C084FC" stroke="#A855F7" strokeWidth="1.5" />
            <circle cx={38 + px * 0.9} cy={54 + py * 0.9} r="2" fill="#FFFFFF" />

            {/* Bottom-Right Optic Lens */}
            <circle cx={62 + px * 0.9} cy={54 + py * 0.9} r={isBlinking ? 2 : 6} fill="#C084FC" stroke="#A855F7" strokeWidth="1.5" />
            <circle cx={62 + px * 0.9} cy={54 + py * 0.9} r="2" fill="#FFFFFF" />
          </g>

          {/* Ghost Stealth Vocoder Mouth */}
          <polygon points="46,72 54,72 50,76" fill="#A855F7" opacity="0.8" />
        </svg>
      )}
    </div>
  );
}
