"use client";

import React, { useEffect, useRef, useState } from 'react';

export interface ForceFieldBackgroundProps {
  imageUrl?: string;
  hue?: number;
  saturation?: number;
  threshold?: number;
  minStroke?: number;
  maxStroke?: number;
  spacing?: number;
  noiseScale?: number;
  density?: number;
  invertImage?: boolean;
  invertWireframe?: boolean;
  magnifierEnabled?: boolean;
  magnifierRadius?: number;
  forceStrength?: number;
  friction?: number;
  restoreSpeed?: number;
  className?: string;
}

export function ForceFieldBackground({
  imageUrl = "https://cdn.pixabay.com/photo/2024/12/13/20/29/alps-9266131_1280.jpg",
  hue = 240,
  saturation = 80,
  threshold = 255,
  minStroke = 1,
  maxStroke = 4,
  spacing = 11,
  noiseScale = 0,
  density = 1.8,
  invertImage = true,
  invertWireframe = true,
  magnifierEnabled = true,
  magnifierRadius = 160,
  forceStrength = 12,
  friction = 0.88,
  restoreSpeed = 0.04,
  className = "",
}: ForceFieldBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const propsRef = useRef({
    hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale,
    density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius,
    forceStrength, friction, restoreSpeed,
  });

  // Keep propsRef in sync without re-creating the sketch
  useEffect(() => {
    propsRef.current = {
      hue, saturation, threshold, minStroke, maxStroke, spacing, noiseScale,
      density, invertImage, invertWireframe, magnifierEnabled, magnifierRadius,
      forceStrength, friction, restoreSpeed,
    };
  });

  useEffect(() => {
    // Guard: only run in browser
    if (typeof window === 'undefined') return;

    let p5Instance: any = null;
    let alive = true;

    const run = async () => {
      // Dynamically import p5 only in the browser
      let p5: any;
      try {
        const mod = await import('p5');
        p5 = mod.default ?? mod;
        p5.disableFriendlyErrors = true;
      } catch (e) {
        console.error('[ForceField] p5 import failed', e);
        if (alive) setStatus('error');
        return;
      }

      // Bail if component unmounted during async gap
      if (!alive || !containerRef.current) return;

      const container = containerRef.current;

      const sketch = (p: any) => {
        let originalImg: any = null;
        let img: any = null;
        let palette: any[] = [];
        let points: { pos: any; originalPos: any; vel: any }[] = [];

        let lastHue = -1;
        let lastSaturation = -1;
        let lastSpacing = -1;
        let lastNoiseScale = -1;
        let lastDensity = -1;
        let lastInvertImage: boolean | null = null;
        let magX = 0;
        let magY = 0;
        const MAG_INERTIA = 0.1;

        p.setup = () => {
          if (!container) return;
          const cnv = p.createCanvas(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
          cnv.parent(container);
          p.noStroke();
          magX = p.width / 2;
          magY = p.height / 2;

          p.loadImage(
            imageUrl,
            (loaded: any) => {
              originalImg = loaded;
              processImage();
              buildPalette(propsRef.current.hue, propsRef.current.saturation);
              buildPoints();
              if (alive) setStatus('ready');
            },
            () => {
              if (alive) setStatus('error');
            }
          );
        };

        p.windowResized = () => {
          if (!container) return;
          p.resizeCanvas(container.clientWidth, container.clientHeight);
          if (originalImg) { processImage(); buildPoints(); }
        };

        function processImage() {
          img = originalImg.get();
          img.resize(p.width || 1, p.height || 1);
          img.filter(p.GRAY);
          if (propsRef.current.invertImage) {
            img.loadPixels();
            for (let i = 0; i < img.pixels.length; i += 4) {
              img.pixels[i]     = 255 - img.pixels[i];
              img.pixels[i + 1] = 255 - img.pixels[i + 1];
              img.pixels[i + 2] = 255 - img.pixels[i + 2];
            }
            img.updatePixels();
          }
          lastInvertImage = propsRef.current.invertImage;
        }

        function buildPalette(h: number, s: number) {
          palette = [];
          p.colorMode(p.HSL);
          for (let i = 0; i < 12; i++) {
            palette.push(p.color(h, s, p.map(i, 0, 11, 95, 5)));
          }
          p.colorMode(p.RGB);
          lastHue = h;
          lastSaturation = s;
        }

        function buildPoints() {
          points = [];
          const { spacing: sp, density: den, noiseScale: ns } = propsRef.current;
          const safe = Math.max(2, sp);
          for (let y = 0; y < (img?.height || 0); y += safe) {
            for (let x = 0; x < (img?.width || 0); x += safe) {
              if (p.random() > den) continue;
              const nx = p.noise(x * ns, y * ns) - 0.5;
              const ny = p.noise((x + 500) * ns, (y + 500) * ns) - 0.5;
              const px = x + nx * safe;
              const py = y + ny * safe;
              points.push({
                pos: p.createVector(px, py),
                originalPos: p.createVector(px, py),
                vel: p.createVector(0, 0),
              });
            }
          }
          lastSpacing   = sp;
          lastNoiseScale = ns;
          lastDensity   = den;
        }

        p.draw = () => {
          if (!img) return;
          p.background(10, 10, 10); // #0A0A0A

          const props = propsRef.current;

          // Detect palette changes
          if (props.hue !== lastHue || props.saturation !== lastSaturation) {
            buildPalette(props.hue, props.saturation);
          }
          // Detect image inversion change
          if (props.invertImage !== lastInvertImage) processImage();
          // Detect density / spacing changes
          if (props.spacing !== lastSpacing || props.noiseScale !== lastNoiseScale || props.density !== lastDensity) {
            buildPoints();
          }

          // Smooth magnifier
          magX = p.lerp(magX, p.mouseX, MAG_INERTIA);
          magY = p.lerp(magY, p.mouseY, MAG_INERTIA);

          // Physics
          if (props.magnifierEnabled) {
            for (const pt of points) {
              const dx = pt.pos.x - magX;
              const dy = pt.pos.y - magY;
              const d  = Math.sqrt(dx * dx + dy * dy) || 0.001;
              if (d < props.magnifierRadius) {
                const f = props.forceStrength / d;
                pt.vel.x += (dx / d) * f;
                pt.vel.y += (dy / d) * f;
              }
              pt.vel.x *= props.friction;
              pt.vel.y *= props.friction;
              pt.vel.x += (pt.originalPos.x - pt.pos.x) * props.restoreSpeed;
              pt.vel.y += (pt.originalPos.y - pt.pos.y) * props.restoreSpeed;
              pt.pos.x += pt.vel.x;
              pt.pos.y += pt.vel.y;
            }
          }

          // Draw particles
          img.loadPixels();
          p.noFill();
          for (const pt of points) {
            const x  = pt.pos.x;
            const y  = pt.pos.y;
            const d  = Math.sqrt((x - magX) ** 2 + (y - magY) ** 2);
            const px = p.constrain(Math.floor(x), 0, img.width - 1);
            const py = p.constrain(Math.floor(y), 0, img.height - 1);
            const brightness = img.pixels[(px + py * img.width) * 4];
            if (brightness === undefined) continue;

            const show = props.invertWireframe
              ? brightness < props.threshold
              : brightness > props.threshold;
            if (!show) continue;

            let si = Math.floor(p.map(brightness, 0, 255, 0, palette.length - 1));
            si = p.constrain(si, 0, palette.length - 1);
            let sw = p.map(brightness, 0, 255, props.minStroke, props.maxStroke);
            if (props.magnifierEnabled && d < props.magnifierRadius) {
              sw *= p.map(d, 0, props.magnifierRadius, 2, 1);
            }
            if (palette[si]) {
              p.stroke(palette[si]);
              p.strokeWeight(sw);
              p.point(x, y);
            }
          }
        };
      };

      try {
        // Final null check before instantiation
        if (!alive || !container) return;
        p5.disableFriendlyErrors = true;
        p5Instance = new p5(sketch, container);
      } catch (e) {
        console.error('[ForceField] p5 instantiation failed', e);
        if (alive) setStatus('error');
      }
    };

    run();

    return () => {
      alive = false;
      try { p5Instance?.remove(); } catch { /* silent */ }
    };
  }, [imageUrl]); // only re-init when image changes

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ backgroundColor: '#0A0A0A', overflow: 'hidden' }}
    >
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px', textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'rgba(255,255,255,0.15)',
          pointerEvents: 'none',
        }}>
          Initializing Field...
        </div>
      )}
    </div>
  );
}

export default ForceFieldBackground;
