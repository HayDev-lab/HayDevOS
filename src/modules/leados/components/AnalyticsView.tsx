"use client";

/**
 * LeadOS — Analytics tab.
 *
 * Charts: conversion funnel, lead velocity, source ROI, team performance table,
 * SLA compliance over time.
 */

import { motion } from "framer-motion";
import {
Gauge,
Rocket,
ShieldCheck,
TrendingUp,
Users,
} from "lucide-react";
import { useMemo } from "react";
import {
Area,
AreaChart,
Bar,
BarChart,
CartesianGrid,
Cell,
ComposedChart,
Line,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis
} from "recharts";

import { useLocale } from "@/lib/i18n";
import { cn,formatCompact,formatCurrency } from "@/lib/utils";

import { Card,CardContent } from "@/components/ui/card";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";

import type { LucideIcon } from "lucide-react";
import {
conversionFunnel,
LEAD_STAGES,
SOURCE_BY_ID,
sourceRoiSeries,
STAGE_BY_ID,
} from "../data";
import { useLeadOSData } from "../LeadOSData";
import { OwnerAvatar } from "./shared";

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--popover-foreground)",
    fontSize: "12px",
    boxShadow: "0 8px 24px -12px rgba(0,0,0,0.6)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--foreground)" },
} as const;

const STAGE_COLORS: Record<string, string> = {
  new: "var(--accent-cyan)",
  contacted: "var(--muted-foreground)",
  qualified: "var(--accent-lime)",
  proposal: "var(--accent-amber)",
  negotiation: "var(--accent-violet)",
  won: "var(--success)",
};

const SOURCE_COLORS: string[] = [
  "var(--accent-lime)",
  "var(--accent-cyan)",
  "var(--accent-amber)",
  "var(--accent-violet)",
  "var(--accent-rose)",
  "var(--success)",
];

export function AnalyticsView() {
  const { t, locale } = useLocale();
  const { overview } = useLeadOSData();
  const data = overview!;

  const funnel = useMemo(() => conversionFunnel(data.stageStats), [data.stageStats]);
  const funnelData = useMemo(
    () =>
      funnel.map((f) => ({
        stage: t(STAGE_BY_ID[f.stage].labelKey),
        count: f.count,
        pct: f.pct,
        fill: STAGE_COLORS[f.stage] ?? "var(--muted-foreground)",
      })),
    [funnel, t],
  );

  const velocity = useMemo(
    () => data.leadsOverTime.map((bucket) => ({ week: bucket.week, minutes: 0, deals: bucket.count })),
    [data.leadsOverTime],
  );
  const velocityData = useMemo(
    () => velocity.map((v) => ({ week: v.week, minutes: v.minutes, deals: v.deals })),
    [velocity],
  );

  const roi = useMemo(() => sourceRoiSeries(data.sourceStats), [data.sourceStats]);
  const roiData = useMemo(
    () =>
      roi.map((r, i) => ({
        source: t(SOURCE_BY_ID[r.source].labelKey),
        roi: r.roi,
        revenue: r.revenue,
        cost: r.cost,
        fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
      })),
    [roi, t],
  );

  const slaSeries = useMemo(() => {
    const eligible = Math.max(data.dashboard.activeLeads, 1);
    return [{
      week: new Date().toISOString().slice(0, 10),
      pct: Math.max(0, Math.round(((eligible - data.dashboard.slaBreached) / eligible) * 100)),
    }];
  }, [data.dashboard.activeLeads, data.dashboard.slaBreached]);
  const slaData = useMemo(
    () => slaSeries.map((s) => ({ week: s.week, pct: s.pct })),
    [slaSeries],
  );

  const teamStats = data.teamStats;

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Conversion funnel + SLA compliance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title={t("leados.analytics.conversionFunnel")}
          icon={TrendingUp}
          iconColor="text-lime"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {funnel.map((f) => (
              <span key={f.stage} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_COLORS[f.stage] }} />
                {t(STAGE_BY_ID[f.stage].labelKey)}: {f.pct}%
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={t("leados.analytics.slaCompliance")}
          icon={ShieldCheck}
          iconColor="text-cyan"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slaData} margin={{ top: 4, right: 16, bottom: 4, left: -16 }}>
                <defs>
                  <linearGradient id="sla-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} domain={[60, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="pct"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2}
                  fill="url(#sla-grad)"
                  isAnimationActive={false}
                  dot={{ fill: "var(--accent-cyan)", r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {slaData.slice(-3).map((s) => (
              <div key={s.week} className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.week}</p>
                <p className="mt-0.5 text-sm font-semibold text-cyan">{s.pct}%</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Row 2: Lead velocity + Source ROI */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title={t("leados.analytics.leadVelocity")}
          icon={Rocket}
          iconColor="text-violet"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={velocityData} margin={{ top: 4, right: 16, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="l" stroke="var(--accent-cyan)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis yAxisId="r" orientation="right" stroke="var(--accent-lime)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Line
                  yAxisId="l"
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2}
                  dot={{ fill: "var(--accent-cyan)", r: 3 }}
                  isAnimationActive={false}
                />
                <Bar yAxisId="r" dataKey="deals" fill="var(--accent-lime)" radius={[4, 4, 0, 0]} barSize={18} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
              {t("leados.detail.responseTime")} ({t("common.minute")})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              {t("leados.analytics.dealsClosed")}
            </span>
          </div>
        </SectionCard>

        <SectionCard
          title={t("leados.analytics.sourceRoi")}
          icon={Gauge}
          iconColor="text-amber"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="source" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="roi" radius={[4, 4, 0, 0]} barSize={26}>
                  {roiData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Row 3: Team performance table */}
      <SectionCard
        title={t("leados.analytics.teamPerformance")}
        icon={Users}
        iconColor="text-lime"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-card">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.owner")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.team.leadCount")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.team.winRate")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.team.workload")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.team.pipelineValue")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.analytics.dealsClosed")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats.map((s, i) => (
                <motion.tr
                  key={s.ownerId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: i * 0.02 }}
                  className="border-border transition-colors hover:bg-muted/40"
                >
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <OwnerAvatar ownerId={s.ownerId} size="xs" />
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">{s.openLeads}</TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">
                    {Math.round(s.winRate * 100)}%
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            s.workload > 80 ? "bg-rose" : s.workload > 50 ? "bg-amber" : "bg-lime",
                          )}
                          style={{ width: `${s.workload}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{s.workload}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm font-medium text-foreground">
                    {formatCurrency(s.pipelineValue, "USD", locale)}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">
                    {s.wonLeads} · {formatCompact(s.wonValue, locale)}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Footer summary */}
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
        <span>{t("leados.runtime.leadStageSummary", { stages: LEAD_STAGES.length, leads: data.dashboard.totalLeads })}</span>
        <span>
          {t("leados.runtime.slaSummary", { leads: velocity.reduce((sum, item) => sum + item.deals, 0), percent: slaData[slaData.length - 1]?.pct ?? 0 })}
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  iconColor = "text-lime",
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("surface-elevated", className)}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
