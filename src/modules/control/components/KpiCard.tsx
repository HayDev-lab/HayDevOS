"use client";

/**
 * Control — shared KPI card.
 *
 * Renders an executive KPI: icon, label, value, delta vs prior period (green
 * arrow up / red arrow down), a sparkline (recharts AreaChart) in the accent
 * tone, a source-label subtitle, and a click affordance that drilldowns into
 * the source module via `useAppStore.setActiveModule`.
 */

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight, ArrowRight, type LucideIcon } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, formatCurrency, toneClasses } from "@/lib/utils";
import type { KpiCardData, KpiTone, Priority } from "../types";

const TONE_DOT: Record<KpiTone, string> = {
  lime: "bg-lime",
  cyan: "bg-cyan",
  amber: "bg-amber",
  rose: "bg-rose",
  violet: "bg-violet",
};

const PRIORITY_TONE: Record<Priority, "rose" | "amber" | "cyan" | "muted"> = {
  CRITICAL: "rose",
  HIGH: "amber",
  MEDIUM: "cyan",
  INFO: "muted",
};

export function PriorityBadge({ priority, label }: { priority: Priority; label?: string }) {
  const tone = PRIORITY_TONE[priority];
  const cls = toneClasses(tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        cls.text,
        cls.bg,
        cls.border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} aria-hidden />
      {label ?? priority}
    </span>
  );
}

export function KpiCard({
  kpi,
  icon: Icon,
  onClick,
}: {
  kpi: KpiCardData;
  icon?: LucideIcon;
  onClick?: () => void;
}) {
  const { t } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const positive = kpi.deltaPct >= 0;
  const data = useMemo(() => kpi.sparkline.map((v, i) => ({ i, v })), [kpi.sparkline]);
  const stroke = `var(--accent-${kpi.tone})`;

  const display =
    kpi.unit === "currency"
      ? formatCurrency(kpi.value)
      : kpi.displayValue;

  const handleClick = () => {
    if (onClick) return onClick();
    setActiveModule(kpi.moduleId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "surface-elevated group/kpi relative flex w-full flex-col gap-0 overflow-hidden rounded-xl border border-border/60 p-4 text-left transition-all",
        "hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
      aria-label={`${t(kpi.labelKey)}: ${display}. ${t("control.kpi.openSource")}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {Icon ? (
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[kpi.tone])} aria-hidden />
            )}
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t(kpi.labelKey)}
            </p>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
            {display}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            positive
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
          title={t("control.kpi.deltaVsPrior")}
        >
          {positive ? (
            <ArrowUpRight className="h-2.5 w-2.5" />
          ) : (
            <ArrowDownRight className="h-2.5 w-2.5" />
          )}
          {positive ? "+" : ""}
          {kpi.deltaPct.toFixed(1)}%
        </span>
      </div>

      <div className="-mx-1 mt-2 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id={`grad-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#grad-${kpi.id})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {kpi.hint ? (
            <p className="truncate text-[10px] text-muted-foreground/80">{kpi.hint}</p>
          ) : null}
          <p className="truncate text-[10px] font-medium text-muted-foreground/70">
            {t("control.kpi.source")}: {kpi.sourceLabel}
          </p>
        </div>
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/70 opacity-0 transition-opacity group-hover/kpi:opacity-100">
          {t("control.kpi.openSource")}
          <ArrowRight className="h-2.5 w-2.5" />
        </span>
      </div>
    </button>
  );
}

/** Compact variant — smaller card used in dense grids. */
export function KpiCardCompact({ kpi, icon: Icon }: { kpi: KpiCardData; icon?: LucideIcon }) {
  const { t } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const positive = kpi.deltaPct >= 0;
  const data = useMemo(() => kpi.sparkline.map((v, i) => ({ i, v })), [kpi.sparkline]);
  const stroke = `var(--accent-${kpi.tone})`;
  const display = kpi.unit === "currency" ? formatCurrency(kpi.value) : kpi.displayValue;

  return (
    <button
      type="button"
      onClick={() => setActiveModule(kpi.moduleId)}
      className="surface-elevated group flex w-full items-center gap-3 rounded-lg border border-border/60 p-3 text-left transition-all hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={`${t(kpi.labelKey)}: ${display}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <span className={cn("h-2 w-2 rounded-full", TONE_DOT[kpi.tone])} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t(kpi.labelKey)}
        </p>
        <p className="truncate text-lg font-semibold text-foreground">{display}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {positive ? "+" : ""}
          {kpi.deltaPct.toFixed(1)}%
        </span>
        <div className="h-4 w-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.2} fill="none" isAnimationActive={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </button>
  );
}
