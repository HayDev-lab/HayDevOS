"use client";

/**
 * AnalyticsView — recharts dashboard:
 *  - Executions over time (stacked area: success / failed / awaiting)
 *  - Top automations by runs (horizontal bar)
 *  - Failure reasons (donut/pie)
 *  - Approval wait time (bar)
 *  - KPI row: total runs, success rate, avg duration, pending approvals
 */

import { CheckCircle2,Clock,Hourglass,TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
Area,
AreaChart,
Bar,
BarChart,
CartesianGrid,
Cell,
Legend,
Pie,
PieChart,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from "recharts";

import { Card,CardContent } from "@/components/ui/card";
import { useLocale } from "@/lib/i18n";
import { cn,formatCompact } from "@/lib/utils";
import {
approvalWaitBuckets,
executionsTimeSeries,
failureReasons,
topAutomationsByRuns,
} from "../data";
import { localizeAutomationText } from "../localization";
import type { AutomationRun } from "../types";

interface Props {
  runs: AutomationRun[];
}

const COLORS = {
  lime: "var(--accent-lime)",
  cyan: "var(--accent-cyan)",
  amber: "var(--accent-amber)",
  rose: "var(--accent-rose)",
  violet: "var(--accent-violet)",
};

export function AnalyticsView({ runs }: Props) {
  const { t, locale } = useLocale();

  const localizedTimeSeries = useMemo(
    () => executionsTimeSeries.map((item) => ({ ...item, day: localizeAutomationText(item.day, locale) })),
    [locale],
  );
  const localizedTopAutomations = useMemo(
    () => topAutomationsByRuns.map((item) => ({ ...item, name: localizeAutomationText(item.name, locale) })),
    [locale],
  );
  const localizedFailureReasons = useMemo(
    () => failureReasons.map((item) => ({ ...item, reason: localizeAutomationText(item.reason, locale) })),
    [locale],
  );
  const localizedApprovalWait = useMemo(
    () => approvalWaitBuckets.map((item) => ({ ...item, bucket: localizeAutomationText(item.bucket, locale) })),
    [locale],
  );

  const kpis = useMemo(() => {
    const total = runs.length;
    const success = runs.filter((r) => r.status === "success").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const awaiting = runs.filter((r) => r.status === "awaiting_approval").length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    const durations = runs.filter((r) => r.durationMs > 0).map((r) => r.durationMs);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
    return { total, success, failed, awaiting, successRate, avgDuration };
  }, [runs]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("automation.analytics.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.analytics.sub")}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          tone="lime"
          label={t("automation.analytics.totalRuns")}
          value={kpis.total.toString()}
          sub={`${kpis.success} ${t("automation.run.success").toLowerCase()}`}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="cyan"
          label={t("automation.analytics.successRate")}
          value={`${kpis.successRate}%`}
          sub={`${kpis.failed} ${t("automation.run.failed").toLowerCase()}`}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          tone="violet"
          label={t("automation.analytics.avgDuration")}
          value={kpis.avgDuration > 0 ? `${kpis.avgDuration} ${t("automation.analytics.milliseconds")}` : "—"}
          sub={t("automation.analytics.median")}
        />
        <KpiCard
          icon={<Hourglass className="h-4 w-4" />}
          tone="amber"
          label={t("automation.analytics.pendingApprovals")}
          value={kpis.awaiting.toString()}
          sub={t("automation.run.awaiting_approval")}
        />
      </div>

      {/* Executions over time + Failure reasons */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="surface-elevated lg:col-span-2 py-0">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t("automation.analytics.execOverTime")}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={localizedTimeSeries} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <defs>
                    <linearGradient id="grad-success" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.lime} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={COLORS.lime} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-failed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.rose} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={COLORS.rose} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-await" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.amber} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={COLORS.amber} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stackId="1"
                    stroke={COLORS.lime}
                    strokeWidth={1.75}
                    fill="url(#grad-success)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stackId="1"
                    stroke={COLORS.rose}
                    strokeWidth={1.5}
                    fill="url(#grad-failed)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="awaiting"
                    stackId="1"
                    stroke={COLORS.amber}
                    strokeWidth={1.5}
                    fill="url(#grad-await)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated py-0">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t("automation.analytics.failureReasons")}
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={localizedFailureReasons}
                    dataKey="count"
                    nameKey="reason"
                    innerRadius={48}
                    outerRadius={88}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {localizedFailureReasons.map((_, i) => (
                      <Cell
                        key={i}
                        fill={[COLORS.rose, COLORS.amber, COLORS.violet, COLORS.cyan, COLORS.lime, "var(--muted-foreground)"][i % 6]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, color: "var(--muted-foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top automations + approval wait */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="surface-elevated py-0">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t("automation.analytics.topRuns")}
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={localizedTopAutomations}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(v as number, locale)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar dataKey="runs" fill={COLORS.lime} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated py-0">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t("automation.analytics.approvalWait")}
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={localizedApprovalWait} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar dataKey="count" fill={COLORS.amber} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: "lime" | "cyan" | "amber" | "rose" | "violet";
  label: string;
  value: string;
  sub: string;
}) {
  const toneCls = {
    lime: "text-lime",
    cyan: "text-cyan",
    amber: "text-amber",
    rose: "text-rose",
    violet: "text-violet",
  }[tone];
  return (
    <Card className="surface-elevated py-0">
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40", toneCls)}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-0.5 text-xl font-semibold text-foreground">{value}</div>
          <div className="truncate text-[10px] text-muted-foreground/70">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AnalyticsView;
