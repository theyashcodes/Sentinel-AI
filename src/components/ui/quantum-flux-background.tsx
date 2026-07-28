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
}

// Lightweight multi-octave noise using sine harmonics (no dependencies)
function noise2D(x: number, y: number): number {
  const a = Math.sin(x * 0.00713 + y * 0.00397 + 1.23) * 0.5 + 0.5;
  const b = Math.sin(x * 0.01427 - y * 0.00891 + 2.71) * 0.5 + 0.5;
  const c = Math.sin(-x * 0.00521 + y * 0.01203 + 0.87) * 0.5 + 0.5;
  return (a * 0.5 + b * 0.3 + c * 0.2);
}

// Palette: 8 HSL shades from hue 200, sat 40%, lightness 20-80%
function buildPalette(): string[] {
  const palette: string[] = [];
  for (let i = 0; i < 8; i++) {
    const l = 20 + (i / 7) * 60;
    palette.push(`hsl(200,40%,${l.toFixed(1)}%)`);
  }
  return palette;
}

export function QuantumFluxBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- Config (exact match to p5.js draft) ---
    const SPACING       = 12;
    const MAG_RADIUS    = 180;
    const FORCE         = 15;
    const FRICTION      = 0.92;
    const RESTORE       = 0.04;
    const THRESHOLD     = 50;   // brightness threshold to draw

    const palette = buildPalette();
    let width  = (canvas.width  = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles: Particle[] = [];

    const buildParticles = () => {
      particles = [];
      for (let y = 0; y < height; y += SPACING) {
        for (let x = 0; x < width; x += SPACING) {
          const n = noise2D(x, y);
          if (n < 0.30) continue;            // density gate (≈ 0.3 threshold)
          particles.push({
            x, y, ox: x, oy: y,
            vx: 0, vy: 0,
            brightness: n * 255,
          });
        }
      }
    };

    buildParticles();

    // Smooth mouse position (lerp factor 0.1)
    let mx = width  / 2;
    let my = height / 2;
    let tx = mx, ty = my;

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    const onResize = () => {
      width  = canvas.width  = window.innerWidth;
      height = canvas.height = window.innerHeight;
      buildParticles();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize",    onResize);

    let raf: number;

    const draw = () => {
      // Trail (p5 background with alpha)
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, width, height);

      // Lerp mouse
      mx += (tx - mx) * 0.1;
      my += (ty - my) * 0.1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;

        // Force field
        const dx   = p.x - mx;
        const dy   = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAG_RADIUS && dist > 0) {
          const push = FORCE / (dist * 0.05 + 1);
          p.vx += (dx / dist) * push;
          p.vy += (dy / dist) * push;
        }

        // Damping + spring restore
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        p.vx += (p.ox - p.x) * RESTORE;
        p.vy += (p.oy - p.y) * RESTORE;
        p.x  += p.vx;
        p.y  += p.vy;

        if (p.brightness < THRESHOLD) continue;

        // Palette index (0-7)
        const idx = Math.min(7, Math.floor((p.brightness / 255) * 7));
        ctx.fillStyle = palette[idx]!;

        // Size: 1-3px based on brightness; 2.5x at cursor centre
        let size = 0.5 + (p.brightness / 255) * 1.5;
        if (dist < MAG_RADIUS) {
          size *= 1 + (1 - dist / MAG_RADIUS) * 1.5; // up to 2.5x at centre
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize",    onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-black pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
