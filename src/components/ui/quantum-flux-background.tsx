"use client";

import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  brightness: number;
}

export function QuantumFluxBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Force Field Configuration matching the draft
    const spacing = 16;
    const magnifierRadius = 180;
    const forceStrength = 14;
    const friction = 0.92;
    const restoreSpeed = 0.04;

    let points: Point[] = [];

    // Simple procedural noise function for point density
    const pseudoNoise = (x: number, y: number) => {
      const sinX = Math.sin(x * 0.008 + 1.2);
      const cosY = Math.cos(y * 0.008 + 0.8);
      const sinXY = Math.sin((x + y) * 0.005);
      return (sinX + cosY + sinXY + 3) / 6;
    };

    const initPoints = () => {
      points = [];
      for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
          const n = pseudoNoise(x, y);
          if (n < 0.25) continue;

          points.push({
            x,
            y,
            ox: x,
            oy: y,
            vx: 0,
            vy: 0,
            brightness: n * 255,
          });
        }
      }
    };

    initPoints();

    let targetMouseX = width / 2;
    let targetMouseY = height / 2;
    let currentMouseX = targetMouseX;
    let currentMouseY = targetMouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initPoints();
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    const render = () => {
      // Trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, width, height);

      // Smooth mouse lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.1;
      currentMouseY += (targetMouseY - currentMouseY) * 0.1;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (!pt) continue;

        // Force field interaction
        const dx = pt.x - currentMouseX;
        const dy = pt.y - currentMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < magnifierRadius) {
          const force = forceStrength / (dist * 0.05 + 1);
          const nx = dist === 0 ? 0 : dx / dist;
          const ny = dist === 0 ? 0 : dy / dist;
          pt.vx += nx * force;
          pt.vy += ny * force;
        }

        // Apply friction and restoring spring force
        pt.vx *= friction;
        pt.vy *= friction;
        pt.vx += (pt.ox - pt.x) * restoreSpeed;
        pt.vy += (pt.oy - pt.y) * restoreSpeed;

        pt.x += pt.vx;
        pt.y += pt.vy;

        // Render point with hue variations matching Quantum Flux palette
        if (pt.brightness > 45) {
          ctx.beginPath();

          // Calculate color based on brightness & mouse distance
          const normBright = Math.min(1, pt.brightness / 255);
          const lightness = 20 + normBright * 60;
          let size = 1 + normBright * 1.8;

          if (dist < magnifierRadius) {
            const magFactor = 1 + (1 - dist / magnifierRadius) * 1.5;
            size *= magFactor;
          }

          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(200, 40%, ${lightness}%)`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}
