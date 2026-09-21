"use client";

/**
 * HayDevOS Business Audit — shared UI primitives.
 *
 * - `ScoreGauge` — big radial gauge (recharts RadialBarChart) for the overall
 *   score on the Report tab.
 * - `MiniScoreGauge` — compact version for category cards / compare rows.
 * - `ScoreBadge`, `ImpactBadge`, `MaturityBadge` — small status pills.
 * - `ScoreBar` — linear progress bar with score-band colour.
 * - `DeterministicBadge` — the "Deterministic — no AI mutation" pill.
 */

import { motion } from "framer-motion";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { ShieldCheck, Sparkles, Zap, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import {
  DEFAULT_AUDIT_SETTINGS,
  impactTone,
  MATURITY_TONE,
  scoreTone,
  type AuditSettings,
  type Impact,
  type Maturity,
} from "../types";

const TONE_COLOR: Record<"lime" | "amber" | "rose" | "cyan" | "violet", string> = {
  lime: "var(--accent-lime)",
  amber: "var(--accent-amber)",
  rose: "var(--accent-rose)",
  cyan: "var(--accent-cyan)",
  violet: "var(--accent-violet)",
};

const TONE_TEXT: Record<"lime" | "amber" | "rose" | "cyan" | "violet", string> = {
  lime: "text-lime",
  amber: "text-amber",
  rose: "text-rose",
  cyan: "text-cyan",
  violet: "text-violet",
};

const TONE_BG: Record<"lime" | "amber" | "rose" | "cyan" | "violet", string> = {
  lime: "bg-lime/10 border-lime/30",
  amber: "bg-amber/10 border-amber/30",
  rose: "bg-rose/10 border-rose/30",
  cyan: "bg-cyan/10 border-cyan/30",
  violet: "bg-violet/10 border-violet/30",
};

// ─────────────────────────────────────────────────────────────────────────────
// ScoreGauge — big overall gauge
// ─────────────────────────────────────────────────────────────────────────────

export function ScoreGauge({
  score,
  size = 220,
  label,
  sublabel,
  settings = DEFAULT_AUDIT_SETTINGS,
}: {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
  settings?: AuditSettings;
}) {
  const tone = scoreTone(score, settings);
  const color = TONE_COLOR[tone];
  const data = [{ name: "score", value: score, fill: color }];
  return (
    <div className="relative" style={{ height: size, width: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="74%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: "var(--muted)" }}
            dataKey="value"
            cornerRadius={12}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={cn("text-5xl font-semibold tracking-tight", TONE_TEXT[tone])}
        >
          {score}
        </motion.span>
        {label ? (
          <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        ) : null}
        {sublabel ? (
          <span className="mt-0.5 text-[10px] text-muted-foreground/70">{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniScoreGauge — small radial for category cards
// ─────────────────────────────────────────────────────────────────────────────

export function MiniScoreGauge({
  score,
  size = 96,
  settings = DEFAULT_AUDIT_SETTINGS,
}: {
  score: number;
  size?: number;
  settings?: AuditSettings;
}) {
  const tone = scoreTone(score, settings);
  const color = TONE_COLOR[tone];
  const data = [{ name: "score", value: score, fill: color }];
  return (
    <div className="relative" style={{ height: size, width: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: "var(--muted)" }}
            dataKey="value"
            cornerRadius={8}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className={cn("text-xl font-semibold tracking-tight", TONE_TEXT[tone])}>
          {score}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreBadge — small pill with band colour + label
// ─────────────────────────────────────────────────────────────────────────────

export function ScoreBadge({
  score,
  settings = DEFAULT_AUDIT_SETTINGS,
  showLabel = true,
}: {
  score: number;
  settings?: AuditSettings;
  showLabel?: boolean;
}) {
  const { t } = useLocale();
  const tone = scoreTone(score, settings);
  const label =
    score >= settings.goodThreshold
      ? t("audit.band.good")
      : score >= settings.needsWorkThreshold
        ? t("audit.band.needsWork")
        : t("audit.band.weak");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        TONE_BG[tone],
        TONE_TEXT[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />
      {score}
      {showLabel ? <span className="opacity-70">· {label}</span> : null}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreBar — linear progress bar with score-band colour
// ─────────────────────────────────────────────────────────────────────────────

export function ScoreBar({
  score,
  height = 8,
  settings = DEFAULT_AUDIT_SETTINGS,
  showThresholds = false,
}: {
  score: number;
  height?: number;
  settings?: AuditSettings;
  showThresholds?: boolean;
}) {
  const tone = scoreTone(score, settings);
  const color = TONE_COLOR[tone];
  return (
    <div
      className="relative w-full overflow-hidden rounded-full bg-muted"
      style={{ height }}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
      {showThresholds ? (
        <>
          <div
            className="absolute top-0 bottom-0 border-l border-border/60"
            style={{ left: `${settings.needsWorkThreshold}%` }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-border/60"
            style={{ left: `${settings.goodThreshold}%` }}
          />
        </>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ImpactBadge / MaturityBadge / DeterministicBadge
// ─────────────────────────────────────────────────────────────────────────────

export function ImpactBadge({ impact }: { impact: Impact }) {
  const { t } = useLocale();
  const tone = impactTone(impact);
  const Icon = impact === "high" ? AlertTriangle : impact === "medium" ? Zap : Sparkles;
  const label =
    impact === "high"
      ? t("audit.impact.high")
      : impact === "medium"
        ? t("audit.impact.medium")
        : t("audit.impact.low");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        TONE_BG[tone],
        TONE_TEXT[tone],
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function MaturityBadge({ maturity }: { maturity: Maturity }) {
  const { t } = useLocale();
  const tone = MATURITY_TONE[maturity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        TONE_BG[tone],
        TONE_TEXT[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />
      {t(`audit.maturity.${maturity}`)}
    </span>
  );
}

export function DeterministicBadge() {
  const { t } = useLocale();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 text-[10px] font-medium text-lime"
      title={t("audit.deterministic.tooltip")}
    >
      <ShieldCheck className="h-3 w-3" />
      {t("audit.deterministic.label")}
    </span>
  );
}

export { TONE_COLOR, TONE_TEXT, TONE_BG };
