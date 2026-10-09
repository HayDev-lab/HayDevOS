"use client";

/**
 * Control — SalesView.
 *
 * Sales drilldown: pipeline value, active leads, won deals, conversion rate,
 * avg deal size, sales over time chart, top deals at risk, owner leaderboard.
 * Each KPI card clickable → LeadOS.
 */

import { motion } from "framer-motion";
import { AlertTriangle,Trophy,Users } from "lucide-react";
import { useMemo } from "react";
import {
Bar,
BarChart,
CartesianGrid,
Cell,
ComposedChart,
Line,
Bar as RBar,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from "recharts";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn,formatCompact,formatCurrency,toneClasses } from "@/lib/utils";
import type { SalesSummary } from "../types";
import { KpiCard } from "./KpiCard";

const STAGE_TONE: Record<string, "lime" | "cyan" | "amber" | "rose" | "violet"> = {
  new: "lime",
  contacted: "cyan",
  qualified: "cyan",
  proposal: "amber",
  negotiation: "amber",
  won: "lime",
  lost: "rose",
};

export function SalesView({ summary }: { summary: SalesSummary }) {
  const { t } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const overTimeData = useMemo(
    () => summary.overTime.map((b) => ({ ...b, valueK: b.value / 1000 })),
    [summary.overTime],
  );

  const leaderboardMax = useMemo(
    () => Math.max(1, ...summary.leaderboard.map((l) => l.wonValue)),
    [summary.leaderboard],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summary.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sales over time */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.sales.overTime")}
            </h3>
            <span className="text-[10px] text-muted-foreground/70">
              {t("control.window.label")}: {t(summary.window.labelKey)}
            </span>
          </header>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={overTimeData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" vertical={false} />
                <XAxis dataKey="bucket" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v * 1000)} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Bar yAxisId="l" dataKey="leads" name={t("control.sales.newLeads")} fill="var(--accent-cyan)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar yAxisId="l" dataKey="won" name={t("control.sales.won")} fill="var(--accent-lime)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Line yAxisId="r" type="monotone" dataKey="valueK" name={t("control.sales.pipelineValue")} stroke="var(--accent-amber)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Pipeline by stage */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.sales.byStage")}
            </h3>
          </header>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.byStage.map((s) => ({ ...s, valueK: s.value / 1000 }))}
                layout="vertical"
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v * 1000)} />
                <YAxis type="category" dataKey="stage" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: number) => formatCurrency(v * 1000)}
                />
                <RBar dataKey="valueK" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                  {summary.byStage.map((s, i) => (
                    <Cell key={i} fill={`var(--accent-${STAGE_TONE[s.stage] ?? "cyan"})`} />
                  ))}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-muted-foreground sm:grid-cols-4">
            {summary.byStage.map((s) => (
              <button
                key={s.stage}
                type="button"
                onClick={() => setActiveModule("leados")}
                className="flex items-center justify-between gap-1 rounded border border-transparent px-1 py-0.5 hover:border-border/60 hover:bg-muted/30"
              >
                <span className="flex items-center gap-1 truncate">
                  <span className={cn("h-1.5 w-1.5 rounded-full", toneClasses(STAGE_TONE[s.stage]).dot)} />
                  {t(s.labelKey)}
                </span>
                <span className="font-mono">{s.count}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Deals at risk */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.sales.dealsAtRisk")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.dealsAtRisk.map((d) => (
              <li
                key={d.id}
                className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {d.company ?? d.name}
                    </span>
                    <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {d.stage}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                    {t("control.sales.idle")}: {d.staleDays}d · {t("control.sales.owner")}: {d.ownerId}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(d.value, d.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule("leados")}
                  className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                  aria-label={t("control.attention.open")}
                >
                  {t("control.attention.open")}
                </button>
              </li>
            ))}
            {summary.dealsAtRisk.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.sales.noDealsAtRisk")}
              </li>
            ) : null}
          </ul>
        </section>

        {/* Owner leaderboard */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-lime" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.sales.leaderboard")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.leaderboard.map((o, i) => (
              <li
                key={o.ownerId}
                className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5"
              >
                <div className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  i === 0 ? "bg-lime/15 text-lime" : "bg-muted/60 text-muted-foreground",
                )}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-semibold text-foreground">{o.name}</span>
                    <span className="text-xs font-semibold text-foreground">
                      {formatCompact(o.wonValue)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/80">
                    <span className="inline-flex items-center gap-0.5">
                      <Users className="h-2.5 w-2.5" />
                      {o.deals} {t("control.sales.deals")}
                    </span>
                    <span>·</span>
                    <span>{o.won} {t("control.sales.won")}</span>
                    <span>·</span>
                    <span>{formatCompact(o.pipeline)} {t("control.sales.pipelineShort")}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-lime"
                      style={{ width: `${Math.max(4, Math.round((o.wonValue / leaderboardMax) * 100))}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule("leados")}
                  className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                  aria-label={t("control.attention.open")}
                >
                  {t("control.attention.open")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </motion.div>
  );
}
