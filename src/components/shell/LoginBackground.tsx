"use client";

/**
 * LoginBackground — animated constellation canvas behind the LoginScreen
 * left panel (Task 13 styling polish).
 *
 * Renders an HTML5 <canvas> absolutely positioned behind the existing
 * gradient-mesh + grid (z-0, pointer-events-none). ~50 nodes drift slowly,
 * with low-opacity lines drawn between nearby nodes (distance < ~140px).
 *
 * Power-saving / accessibility:
 *   - DPR-clamped to Math.min(devicePixelRatio, 2).
 *   - requestAnimationFrame loop capped at ~30fps via timestamp throttle.
 *   - `prefers-reduced-motion: reduce` → render ONE static frame (no loop).
 *   - Pauses the loop when `document.hidden` (visibilitychange listener).
 *   - On unmount: cancelAnimationFrame + removeEventListener + ResizeObserver
 *     disconnect.
 *   - If canvas context is unavailable, the component renders nothing and the
 *     existing CSS gradient mesh (already in LoginScreen) remains as the
 *     static fallback.
 *
 * Subtle by design: nodes 0.4-0.7 opacity, lines 0.08-0.15 opacity, lime /
 * cyan / zinc palette only (NO indigo / blue).
 */

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Hex colour string (lime / cyan / zinc). */
  color: string;
  /** Opacity 0.4-0.7. */
  alpha: number;
}

const PALETTE = [
  "#a3e635", // accent-lime
  "#22d3ee", // accent-cyan
  "#8b95a5", // muted-foreground (zinc-ish)
];

const NODE_COUNT = 50;
const LINK_DIST = 140; // px (in CSS pixels, not device pixels)
const FPS_CAP = 30;
const FRAME_MS = 1000 / FPS_CAP;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let dpr = 1;
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];

    function setupCanvas() {
      if (!canvas || !ctx) return;
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect();
      width = rect?.width ?? window.innerWidth;
      height = rect?.height ?? window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // (Re)build the node field. We deliberately cap at NODE_COUNT to keep
      // the loop cheap on large screens; on small screens we drop down to
      // a density-based floor so the constellation still reads.
      const count = Math.max(20, Math.min(NODE_COUNT, Math.floor((width * height) / 28000)));
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: rand(0, width),
          y: rand(0, height),
          vx: rand(-0.12, 0.12),
          vy: rand(-0.12, 0.12),
          r: rand(1.5, 2.5),
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          alpha: rand(0.4, 0.7),
        });
      }
    }

    function drawFrame() {
      if (!ctx || width === 0) return;
      ctx.clearRect(0, 0, width, height);

      // Draw lines between nearby nodes first so nodes sit on top.
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const d = Math.sqrt(d2);
            // Opacity falls off with distance: 0.15 at d=0 → 0.08 at d=LINK_DIST.
            const alpha = 0.15 * (1 - d / LINK_DIST) + 0.08 * (d / LINK_DIST);
            ctx.strokeStyle = `rgba(139, 149, 165, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes on top.
      for (const n of nodes) {
        ctx.beginPath();
        ctx.fillStyle = hexWithAlpha(n.color, n.alpha);
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        // Subtle glow for lime/cyan nodes only.
        if (n.color !== "#8b95a5") {
          ctx.beginPath();
          ctx.fillStyle = hexWithAlpha(n.color, n.alpha * 0.18);
          ctx.arc(n.x, n.y, n.r * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function stepNodes() {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        // Wrap around edges — keeps the field stable and avoids "drift away".
        if (n.x < -4) n.x = width + 4;
        else if (n.x > width + 4) n.x = -4;
        if (n.y < -4) n.y = height + 4;
        else if (n.y > height + 4) n.y = -4;
      }
    }

    let rafId: number | null = null;
    let lastFrame = 0;
    let running = true;

    function loop(ts: number) {
      if (!running) return;
      if (ts - lastFrame >= FRAME_MS) {
        lastFrame = ts;
        stepNodes();
        drawFrame();
      }
      rafId = window.requestAnimationFrame(loop);
    }

    function handleVisibility() {
      if (document.hidden) {
        running = false;
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (!prefersReducedMotion) {
        running = true;
        lastFrame = 0;
        rafId = window.requestAnimationFrame(loop);
      }
    }

    setupCanvas();
    drawFrame(); // always paint at least one frame so the static version is visible too

    if (!prefersReducedMotion) {
      rafId = window.requestAnimationFrame(loop);
      document.addEventListener("visibilitychange", handleVisibility);
    }

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      setupCanvas();
      drawFrame();
    }) : null;
    resizeObserver?.observe(canvas.parentElement ?? canvas);

    return () => {
      running = false;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", handleVisibility);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}

/** Tiny helper: convert a #rrggbb hex string + alpha [0..1] into an
 *  rgba() string for the canvas fillStyle. Falls back to the raw hex if
 *  parsing fails. */
function hexWithAlpha(hex: string, alpha: number): string {
  if (hex.length !== 7 || hex[0] !== "#") return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

export default LoginBackground;
