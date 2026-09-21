"use client";

/**
 * Control — EcosystemViz.
 *
 * A lightweight SVG node graph of the HayDevOS ecosystem: modules as nodes
 * (with status-colored fill), connections as edges. Control sits at the center
 * with all products on a ring around it.
 *
 * - Reduced-motion safe: no animation, just a static SVG.
 * - Static fallback: if `prefers-reduced-motion` is set, we still render the
 *   same SVG (it has no animation to disable).
 * - Clicking a node drilldowns into that module via `useAppStore.setActiveModule`.
 */

import { useId } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import type { ModuleHealth } from "../types";
import { useLocale } from "@/lib/i18n";

const HEALTH_FILL: Record<ModuleHealth, string> = {
  healthy: "var(--accent-lime)",
  warning: "var(--accent-amber)",
  critical: "var(--accent-rose)",
  offline: "var(--muted-foreground)",
};

const HEALTH_GLOW: Record<ModuleHealth, string> = {
  healthy: "rgba(163,230,53,0.18)",
  warning: "rgba(245,158,11,0.18)",
  critical: "rgba(244,63,94,0.18)",
  offline: "rgba(139,149,165,0.12)",
};

interface Node {
  id: string;
  label: string;
  health: ModuleHealth;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
}

export function EcosystemViz({
  nodes,
  edges,
  className,
}: {
  nodes: Node[];
  edges: Edge[];
  className?: string;
}) {
  const { t } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const glowId = useId();

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  // viewBox 0..100 in both axes; we map x/y (also 0..100) to SVG coords.
  const vb = 100;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-xl border border-border/60 bg-card/40 p-2", className)}>
      <svg
        viewBox={`0 0 ${vb} ${vb}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label={t("control.ecosystem.aria")}
      >
        <defs>
          <filter id={`${glowId}-healthy`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        <g stroke="var(--border)" strokeWidth={0.4} opacity={0.7}>
          {edges.map((e, i) => {
            const from = nodeById.get(e.from);
            const to = nodeById.get(e.to);
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            // Quadratic curve outward from center
            const cx = midX + (midX - 50) * 0.15;
            const cy = midY + (midY - 50) * 0.15;
            return (
              <path
                key={`edge-${i}`}
                d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
                fill="none"
                strokeDasharray="0.6 0.8"
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((n) => {
            const isCenter = n.id === "control";
            const r = isCenter ? 6 : 3.6;
            const fill = HEALTH_FILL[n.health];
            const glow = HEALTH_GLOW[n.health];
            return (
              <g
                key={n.id}
                className="cursor-pointer"
                onClick={() => !isCenter && setActiveModule(n.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !isCenter) {
                    e.preventDefault();
                    setActiveModule(n.id);
                  }
                }}
                aria-label={`${n.label} — ${n.health}`}
              >
                {/* Glow halo */}
                <circle cx={n.x} cy={n.y} r={r + 2.5} fill={glow} />
                {/* Node body */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={fill}
                  stroke="var(--background)"
                  strokeWidth={0.6}
                  filter={n.health === "healthy" ? `url(#${glowId}-healthy)` : undefined}
                />
                {/* Label */}
                <text
                  x={n.x}
                  y={n.y + r + 3.2}
                  textAnchor="middle"
                  fontSize={isCenter ? 3.2 : 2.6}
                  fontWeight={isCenter ? 600 : 500}
                  fill="var(--foreground)"
                  className="select-none"
                >
                  {n.label}
                </text>
                {isCenter ? (
                  <text
                    x={n.x}
                    y={n.y + 1}
                    textAnchor="middle"
                    fontSize={2.6}
                    fontWeight={700}
                    fill="var(--background)"
                    className="select-none"
                  >
                    C
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
