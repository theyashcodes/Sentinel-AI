"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  brightness: number;
  baseRadius: number;
  hueIndex: number;
}

// Lightweight 2D noise using multi-octave sine harmonics
function noise2D(x: number, y: number): number {
  const a = Math.sin(x * 0.00713 + y * 0.00397 + 1.23) * 0.5 + 0.5;
  const b = Math.sin(x * 0.01427 - y * 0.00891 + 2.71) * 0.5 + 0.5;
  const c = Math.sin(-x * 0.00521 + y * 0.01203 + 0.87) * 0.5 + 0.5;
  return a * 0.5 + b * 0.3 + c * 0.2;
}

// Refined, subtle daylight palette — ensures zero visual interference with foreground content
const DAY_PALETTE = [
  "rgba(148, 163, 184, 0.22)", // subtle slate
  "rgba(99, 102, 241, 0.25)",  // soft indigo
  "rgba(79, 70, 229, 0.28)",   // committed indigo
  "rgba(37, 99, 235, 0.26)",   // royal cobalt
  "rgba(14, 165, 233, 0.24)",  // bright sky
  "rgba(67, 56, 202, 0.32)",   // deep indigo
  "rgba(99, 102, 241, 0.36)",  // vivid indigo
  "rgba(79, 70, 229, 0.42)",   // high-density focus
];

export function DayModeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Spacious, elegant particle distribution
    const SPACING = 20;
    const MAG_RADIUS = 180;
    const FORCE = 14;
    const FRICTION = 0.92;
    const RESTORE = 0.04;
    const THRESHOLD = 0.38;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles: Particle[] = [];

    const buildParticles = () => {
      particles = [];
      const cols = Math.ceil(width / SPACING);
      const rows = Math.ceil(height / SPACING);

      for (let r = 0; r <= rows; r++) {
        const y = r * SPACING;
        for (let c = 0; c <= cols; c++) {
          const x = c * SPACING;
          const n = noise2D(x, y);
          if (n < THRESHOLD) continue;

          const paletteIdx = Math.min(
            DAY_PALETTE.length - 1,
            Math.floor(((n - THRESHOLD) / (1 - THRESHOLD)) * DAY_PALETTE.length)
          );

          particles.push({
            x,
            y,
            ox: x,
            oy: y,
            vx: 0,
            vy: 0,
            brightness: n,
            baseRadius: 0.6 + n * 1.0,
            hueIndex: paletteIdx,
          });
        }
      }
    };

    buildParticles();

    // Mouse lerp tracking
    let mx = width / 2;
    let my = height / 2;
    let tx = mx;
    let ty = my;
    let isHovering = false;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      isHovering = true;
    };

    const onLeave = () => {
      isHovering = false;
      tx = width / 2;
      ty = height / 2;
    };

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      buildParticles();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);

    let raf: number;
    let tick = 0;

    const draw = () => {
      tick += 0.015;

      // Clean background fill matching ground #F0F3F8 without dark residue accumulation
      ctx.fillStyle = "rgba(240, 243, 248, 0.85)";
      ctx.fillRect(0, 0, width, height);

      // Lerp mouse coordinates
      mx += (tx - mx) * 0.1;
      my += (ty - my) * 0.1;

      // Ambient illumination halo around cursor in daylight mode
      if (isHovering) {
        const radGrad = ctx.createRadialGradient(mx, my, 0, mx, my, MAG_RADIUS * 1.1);
        radGrad.addColorStop(0, "rgba(99, 102, 241, 0.06)");
        radGrad.addColorStop(0.5, "rgba(14, 165, 233, 0.03)");
        radGrad.addColorStop(1, "transparent");
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(mx, my, MAG_RADIUS * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      const len = particles.length;
      for (let i = 0; i < len; i++) {
        const p = particles[i]!;

        // Gentle breathing wave
        const wave = Math.sin(tick + p.ox * 0.02 + p.oy * 0.015) * 0.6;
        const targetOx = p.ox;
        const targetOy = p.oy + wave;

        // Force field repulsion from cursor
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAG_RADIUS && dist > 0) {
          const push = FORCE / (dist * 0.04 + 1);
          p.vx += (dx / dist) * push;
          p.vy += (dy / dist) * push;
        }

        // Spring physics
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.vx += (targetOx - p.x) * RESTORE;
        p.vy += (targetOy - p.y) * RESTORE;
        p.x += p.vx;
        p.y += p.vy;

        // Sizing
        let radius = p.baseRadius;
        if (dist < MAG_RADIUS) {
          const factor = 1 + (1 - dist / MAG_RADIUS) * 1.5;
          radius *= factor;
        }

        ctx.fillStyle = DAY_PALETTE[p.hueIndex]!;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        backgroundColor: "var(--ground)",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
