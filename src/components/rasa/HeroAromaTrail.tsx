"use client";

import { useEffect, useRef } from "react";

type Puff = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  opacity: number;
};

/**
 * Warm golden aroma smoke across the hero — ambient + stronger cursor trail.
 * Fragrance rising from royal cuisine — not glitter, fire, or neon.
 */
export default function HeroAromaTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const section = canvas.parentElement;
    if (!section) return;

    let puffs: Puff[] = [];
    let raf = 0;
    let lastX = -1;
    let lastY = -1;
    let lastSpawn = 0;
    let lastAmbient = 0;
    let running = true;
    let lastFrame = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const resize = () => {
      const rect = section.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (x: number, y: number, opts?: { ambient?: boolean; boost?: number }) => {
      const ambient = !!opts?.ambient;
      const boost = opts?.boost ?? 1;
      const n = ambient ? 1 + (Math.random() > 0.55 ? 1 : 0) : 2 + (Math.random() > 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        puffs.push({
          x: x + (Math.random() - 0.5) * (ambient ? 28 : 14),
          y: y + (Math.random() - 0.5) * (ambient ? 16 : 10),
          r: ambient ? 22 + Math.random() * 36 : 16 + Math.random() * 28,
          vx: (Math.random() - 0.5) * (ambient ? 0.45 : 0.55),
          vy: -(0.45 + Math.random() * 0.85) * (ambient ? 0.85 : 1),
          life: 0,
          maxLife: 1600 + Math.random() * 600, // ~1.6–2.2s
          opacity: (ambient ? 0.1 + Math.random() * 0.08 : 0.14 + Math.random() * 0.1) * boost,
        });
      }
      if (puffs.length > 140) puffs.splice(0, puffs.length - 140);
    };

    const spawnAmbient = (now: number) => {
      if (now - lastAmbient < 90) return;
      lastAmbient = now;
      const rect = section.getBoundingClientRect();
      // Drift from lower mid / feast areas — like steam rising from cuisine
      const x = rect.width * (0.18 + Math.random() * 0.72);
      const y = rect.height * (0.42 + Math.random() * 0.48);
      spawn(x, y, { ambient: true });
      if (Math.random() > 0.55) {
        spawn(rect.width * (0.35 + Math.random() * 0.4), rect.height * (0.55 + Math.random() * 0.35), {
          ambient: true,
        });
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!finePointer) return;
      const rect = section.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      const now = performance.now();
      const dx = lastX < 0 ? 0 : x - lastX;
      const dy = lastY < 0 ? 0 : y - lastY;
      const dist = Math.hypot(dx, dy);
      lastX = x;
      lastY = y;

      if (dist < 2) return;
      if (now - lastSpawn < 18) return;
      lastSpawn = now;
      spawn(x, y, { boost: 1.25 });
    };

    const onLeave = () => {
      lastX = -1;
      lastY = -1;
    };

    const tick = (t: number) => {
      if (!running) return;
      const dt = lastFrame ? Math.min(32, t - lastFrame) : 16;
      lastFrame = t;
      const rect = section.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      spawnAmbient(t);

      puffs = puffs.filter((p) => {
        p.life += dt;
        const age = p.life / p.maxLife;
        if (age >= 1) return false;

        const s = dt / 16;
        p.x += p.vx * s;
        p.y += p.vy * s;
        p.r += 0.22 * s;
        p.vx *= 0.992;
        p.vy *= 0.994;

        const fade =
          age < 0.1 ? age / 0.1 : age > 0.5 ? 1 - (age - 0.5) / 0.5 : 1;
        const a = Math.min(0.28, p.opacity * fade);

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(232, 196, 110, ${a})`);
        g.addColorStop(0.3, `rgba(226, 182, 88, ${a * 0.65})`);
        g.addColorStop(0.55, `rgba(198, 152, 58, ${a * 0.35})`);
        g.addColorStop(0.8, `rgba(246, 239, 224, ${a * 0.12})`);
        g.addColorStop(1, "rgba(226, 182, 88, 0)");

        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };

    resize();
    // Immediate ambient presence on load
    {
      const rect = section.getBoundingClientRect();
      for (let i = 0; i < 18; i++) {
        spawn(rect.width * (0.15 + Math.random() * 0.7), rect.height * (0.45 + Math.random() * 0.45), {
          ambient: true,
          boost: 1.15,
        });
      }
    }

    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
