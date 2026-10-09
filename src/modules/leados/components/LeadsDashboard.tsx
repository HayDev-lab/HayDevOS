"use client";

/**
 * LeadOS — Dashboard tab.
 *
 * Renders:
 *  - KPI row (6 cards: total leads, new today, in pipeline, won this month,
 *    avg response time, SLA breaches)
 *  - Pipeline funnel chart (recharts BarChart, horizontal)
 *  - Leads-by-source bar chart
 *  - Leads-over-time area chart
 *  - First-response SLA gauge (semi-circular progress)
 *  - Recent activity feed
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  Users,
  UserPlus,
  Filter,
  Trophy,
  Clock,
  AlertOctagon,
  TrendingUp,
  Activity,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency, relativeTime, formatCompact, toneClasses, type StatusTone } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  asLeadRecord,
  LEAD_STAGES,
  STAGE_BY_ID,
  LEAD_SOURCES,
  SOURCE_BY_ID,
} from "../data";
import { useLeadOSData } from "../LeadOSData";
import { activityTone } from "./shared";
import type { LucideIcon } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Chart palette — lime/cyan/amber/violet/rose
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  new: "var(--accent-cyan)",
  contacted: "var(--muted-foreground)",
  qualified: "var(--accent-lime)",
  proposal: "var(--accent-amber)",
  negotiation: "var(--accent-violet)",
  won: "var(--success)",
  lost: "var(--accent-rose)",
};

const SOURCE_COLORS: string[] = [
  "var(--accent-lime)",
  "var(--accent-cyan)",
  "var(--accent-amber)",
  "var(--accent-violet)",
  "var(--accent-rose)",
  "var(--success)",
];

// ─────────────────────────────────────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────────────────────────────────────

interface KpiDef {
  icon: LucideIcon;
  labelKey: string;
  value: string;
  tone: "lime" | "cyan" | "amber" | "rose" | "violet";
  sub?: string;
}

function KpiCard({ def, index }: { def: KpiDef; index: number }) {
  const { t } = useLocale();
  const Icon = def.icon;
  const cls = toneClasses(def.tone as StatusTone);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <Card className="surface-elevated gap-0 overflow-hidden py-0">
        <div className="flex items-start justify-between gap-2 px-4 pt-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t(def.labelKey)}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {def.value}
            </p>
          </div>
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              cls.bg,
              cls.text,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        {def.sub && (
          <p className="px-4 pb-3 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {def.sub}
          </p>
        )}
        {!def.sub && <div className="pb-3" />}
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section card
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// SLA gauge — semi-circular radial bar
// ─────────────────────────────────────────────────────────────────────────────

function SlaGauge({ pct }: { pct: number }) {
  const { t } = useLocale();
  const data = [{ name: "sla", value: pct, fill: "var(--accent-lime)" }];
  return (
    <div className="relative h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "var(--muted)" }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center">
        <span className="text-3xl font-semibold tracking-tight text-foreground">{pct}%</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("leados.dashboard.slaCompliance")}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip styling helper for recharts
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// LeadsDashboard
// ─────────────────────────────────────────────────────────────────────────────

export function LeadsDashboard() {
  const { t, locale } = useLocale();
  const { overview } = useLeadOSData();
  const data = overview!;
  const allLeads = data.leads.map(asLeadRecord);
  const stageStats = data.stageStats;
  const sourceStats = data.sourceStats;
  const overTime = data.leadsOverTime;
  const recentActivities = data.recentActivities.slice(0, 8);
  const responded = allLeads.filter((lead) => lead.firstResponseAt);
  const avgResponseTimeMinutes = responded.length
    ? Math.round(responded.reduce((sum, lead) => sum + (new Date(lead.firstResponseAt!).getTime() - new Date(lead.createdAt).getTime()) / 60_000, 0) / responded.length)
    : 0;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  const slaEligible = Math.max(data.dashboard.activeLeads, 1);
  const kpis = {
    ...data.dashboard,
    newToday: allLeads.filter((lead) => new Date(lead.createdAt) >= startOfToday).length,
    inPipeline: data.dashboard.activeLeads,
    wonThisMonth: allLeads.filter((lead) => lead.stage === "won" && new Date(lead.updatedAt) >= startOfMonth).length,
    avgResponseTimeMinutes,
    slaBreaches: data.dashboard.slaBreached,
    slaCompliancePct: Math.max(0, Math.round(((slaEligible - data.dashboard.slaBreached) / slaEligible) * 100)),
  };

  // Funnel chart data — only open + won stages (skip lost)
  const funnelData = useMemo(
    () =>
      stageStats
        .filter((s) => s.stage !== "lost")
        .map((s) => ({
          stage: t(STAGE_BY_ID[s.stage].labelKey),
          count: s.count,
          value: s.totalValue,
          fill: STAGE_COLORS[s.stage],
        })),
    [stageStats, t],
  );

  // Source bar chart
  const sourceData = useMemo(
    () =>
      sourceStats.map((s, i) => ({
        source: t(SOURCE_BY_ID[s.source].labelKey),
        count: s.count,
        fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
      })),
    [sourceStats, t],
  );

  // Pie distribution
  const pieData = useMemo(
    () =>
      sourceStats.map((s, i) => ({
        name: t(SOURCE_BY_ID[s.source].labelKey),
        value: s.count,
        fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
      })),
    [sourceStats, t],
  );

  const kpiDefs: KpiDef[] = [
    { icon: Users, labelKey: "leados.kpi.totalLeads", value: String(kpis.totalLeads), tone: "lime" },
    { icon: UserPlus, labelKey: "leados.kpi.newToday", value: String(kpis.newToday), tone: "cyan" },
    { icon: Filter, labelKey: "leados.kpi.inPipeline", value: String(kpis.inPipeline), tone: "violet" },
    { icon: Trophy, labelKey: "leados.kpi.wonThisMonth", value: String(kpis.wonThisMonth), tone: "lime" },
    {
      icon: Clock,
      labelKey: "leados.kpi.avgResponseTime",
      value:
        kpis.avgResponseTimeMinutes >= 60
          ? `${Math.floor(kpis.avgResponseTimeMinutes / 60)}h ${kpis.avgResponseTimeMinutes % 60}m`
          : `${kpis.avgResponseTimeMinutes}m`,
      tone: "cyan",
    },
    {
      icon: AlertOctagon,
      labelKey: "leados.kpi.slaBreaches",
      value: String(kpis.slaBreaches),
      tone: kpis.slaBreaches > 0 ? "rose" : "lime",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpiDefs.map((def, i) => (
          <KpiCard key={def.labelKey} def={def} index={i} />
        ))}
      </div>

      {/* Row 1: Funnel + SLA gauge */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title={t("leados.dashboard.pipelineFunnel")}
          icon={TrendingUp}
          iconColor="text-lime"
          className="lg:col-span-2"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
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
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {LEAD_STAGES.filter((s) => s.id !== "lost").map((s) => (
              <span key={s.id} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_COLORS[s.id] }} />
                {t(s.labelKey)}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={t("leados.dashboard.firstResponseSla")}
          icon={Clock}
          iconColor="text-cyan"
        >
          <SlaGauge pct={kpis.slaCompliancePct} />
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("leados.kpi.inPipeline")}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{kpis.inPipeline}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("leados.kpi.slaBreaches")}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-rose">{kpis.slaBreaches}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Row 2: Source bar + Over time area + Pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title={t("leados.dashboard.leadsBySource")}
          icon={Activity}
          iconColor="text-cyan"
        >
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="source" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={26}>
                  {sourceData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title={t("leados.dashboard.leadsOverTime")}
          icon={TrendingUp}
          iconColor="text-lime"
          className="lg:col-span-2"
        >
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overTime} margin={{ top: 4, right: 16, bottom: 4, left: -16 }}>
                <defs>
                  <linearGradient id="leados-ot-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-lime)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent-lime)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--accent-lime)"
                  strokeWidth={2}
                  fill="url(#leados-ot-grad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Row 3: Pie + Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title={t("leados.sources.distribution")}
          icon={Activity}
          iconColor="text-violet"
        >
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  stroke="var(--background)"
                  strokeWidth={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {pieData.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5 truncate">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.fill }} />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto text-foreground/60">{p.value}</span>
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={t("leados.dashboard.recentActivity")}
          icon={Activity}
          iconColor="text-amber"
          className="lg:col-span-2"
        >
          <ScrollArea className="max-h-72">
            <ul className="space-y-1">
              {recentActivities.map((a) => {
                const tone = activityTone(a.type);
                const toneCls = ({
                  lime: "bg-lime",
                  cyan: "bg-cyan",
                  amber: "bg-amber",
                  violet: "bg-violet",
                  rose: "bg-rose",
                  success: "bg-success",
                  warning: "bg-warning",
                  info: "bg-info",
                  destructive: "bg-destructive",
                  muted: "bg-muted-foreground",
                } as const)[tone];
                const lead = allLeads.find((l) => l.id === a.leadId);
                return (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/30"
                  >
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", toneCls)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{lead?.name ?? a.leadId}</span>
                        <span className="ml-2 rounded bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {a.type.replace("_", " ")}
                        </span>
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{a.body}</p>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {relativeTime(a.createdAt, locale)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </SectionCard>
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
        <span>
          {t("leados.runtime.pipelineSummary", { sources: LEAD_SOURCES.length, stages: LEAD_STAGES.length, value: formatCompact(allLeads.reduce((s, l) => s + l.value, 0), locale) })}
        </span>
        <span>
          {t("leados.runtime.wonValue", { value: formatCurrency(allLeads.filter((l) => l.stage === "won").reduce((s, l) => s + l.value, 0), "USD", locale) })}
        </span>
      </div>
    </div>
  );
}
