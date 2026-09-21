"use client";

/**
 * Control — AutomationsView.
 *
 * Automation drilldown: active count, failures, success rate, pending
 * approvals, queue depth. Clickable → Automation.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Workflow, AlertTriangle, Activity } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, relativeTime, toneClasses } from "@/lib/utils";
import type { AutomationSummary } from "../types";
import { KpiCard } from "./KpiCard";

export function AutomationsView({ summary }: { summary: AutomationSummary }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const chartData = useMemo(() => summary.runsOverTime, [summary.runsOverTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summary.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Runs over time */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.automations.runsOverTime")}
            </h3>
          </header>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" vertical={false} />
                <XAxis dataKey="bucket" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="success" name={t("control.automations.success")} stackId="a" fill="var(--accent-lime)" radius={[0, 0, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="failed" name={t("control.automations.failed")} stackId="a" fill="var(--accent-rose)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top failing automations */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.automations.failing")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.failing.map((a) => {
              const rate = a.total > 0 ? (a.failed / a.total) * 100 : 0;
              const tone = rate > 5 ? "rose" : rate > 1 ? "amber" : "cyan";
              const cls = toneClasses(tone);
              return (
                <li
                  key={a.id}
                  className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {a.name}
                      </span>
                      <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                      {a.failed.toLocaleString()} / {a.total.toLocaleString()} {t("control.automations.runsFailed")}
                      {a.lastRunAt ? ` · ${relativeTime(a.lastRunAt, locale)}` : ""}
                    </p>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", cls.dot)} style={{ width: `${Math.max(2, rate)}%` }} />
                    </div>
                  </div>
                  <span className={cn("shrink-0 text-xs font-semibold", cls.text)}>
                    {rate.toFixed(1)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModule("autopilot")}
                    className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                    aria-label={t("control.attention.open")}
                  >
                    {t("control.attention.open")}
                  </button>
                </li>
              );
            })}
            {summary.failing.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.automations.noFailures")}
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      {/* Pending approvals */}
      {summary.pendingApprovals.length > 0 ? (
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Workflow className="h-4 w-4 text-violet" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.automations.pendingApprovals")}
            </h3>
          </header>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {summary.pendingApprovals.map((a) => (
              <li
                key={a.id}
                className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{a.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                    {t("control.automations.trigger")}: {a.triggerType}
                    {a.lastRunAt ? ` · ${relativeTime(a.lastRunAt, locale)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule("autopilot")}
                  className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                  aria-label={t("control.attention.open")}
                >
                  {t("control.attention.open")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </motion.div>
  );
}
