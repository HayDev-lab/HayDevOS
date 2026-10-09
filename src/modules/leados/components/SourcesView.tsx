"use client";

/**
 * LeadOS — Sources & attribution tab.
 *
 * Sources table (name, lead count, conversion rate, cost per lead), Meta Lead
 * Ads connection status card (Integration Hub concept — connected/disconnected
 * toggle), and a sources pie chart.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Facebook,
  Instagram,
  Plug,
  CheckCircle2,
  XCircle,
  Settings2,
  TrendingUp,
  PieChart as PieIcon,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency, formatCompact, toneClasses, type StatusTone } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  LEAD_SOURCES,
  SOURCE_BY_ID,
} from "../data";
import { useLeadOSData } from "../LeadOSData";

const SOURCE_COLORS: string[] = [
  "var(--accent-lime)",
  "var(--accent-cyan)",
  "var(--accent-amber)",
  "var(--accent-violet)",
  "var(--accent-rose)",
  "var(--success)",
];

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

export function SourcesView() {
  const { t, locale } = useLocale();
  const { overview } = useLeadOSData();
  const sourceStats = overview!.sourceStats;
  const metaConnected = false;
  const pieData = useMemo(
    () =>
      sourceStats.map((s, i) => ({
        name: t(SOURCE_BY_ID[s.source].labelKey),
        value: s.count,
        fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
      })),
    [sourceStats, t],
  );

  const barData = useMemo(
    () =>
      sourceStats.map((s, i) => ({
        source: t(SOURCE_BY_ID[s.source].labelKey),
        leads: s.count,
        fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
      })),
    [sourceStats, t],
  );

  const totalLeads = sourceStats.reduce((s, x) => s + x.count, 0);
  const totalCost = sourceStats.reduce((s, x) => s + x.count * (x.costPerLead ?? 0), 0);
  const blendedCpl = totalLeads > 0 && totalCost > 0 ? Math.round(totalCost / totalLeads) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Meta Lead Ads card + KPIs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Meta Lead Ads connection */}
        <Card className="surface-elevated lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-cyan/20 ring-1 ring-border">
                  <Facebook className="h-5 w-5 text-cyan" />
                  <Instagram className="ml-1 h-5 w-5 text-rose" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("leados.sources.metaConnection")}
                    </h3>
                    {metaConnected ? (
                      <Badge
                        variant="outline"
                        className="border-success/30 bg-success/10 px-1.5 py-0 text-[10px] uppercase tracking-wider text-success"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {t("leados.sources.connected")}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-destructive/30 bg-destructive/10 px-1.5 py-0 text-[10px] uppercase tracking-wider text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                        {t("leados.sources.disconnected")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("leados.sources.metaDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={!metaConnected}>
                  <Settings2 className="h-3.5 w-3.5" />
                  {t("leados.sources.configure")}
                </Button>
                <Button
                  variant={metaConnected ? "outline" : "default"}
                  size="sm"
                  disabled
                >
                  <Plug className="h-3.5 w-3.5" />
                  {metaConnected ? t("leados.sources.disconnected") : t("leados.sources.connect")}
                </Button>
              </div>
            </div>

            {/* Sub-stats */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SubStat label={t("leados.sources.leadCount")} value="0" tone="lime" />
              <SubStat label={t("leados.sources.conversionRate")} value="—" tone="cyan" />
              <SubStat label={t("leados.sources.costPerLead")} value="—" tone="amber" />
              <SubStat label={t("integration.tab.sync")} value={t("common.paused")} tone="rose" />
            </div>
          </CardContent>
        </Card>

        {/* Blended KPIs */}
        <Card className="surface-elevated">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-lime" />
              <h3 className="text-sm font-semibold text-foreground">
                {t("leados.dashboard.slaCompliance")}
              </h3>
            </div>
            <div className="mt-3 space-y-2">
              <SubStat label={t("leados.kpi.totalLeads")} value={String(totalLeads)} tone="lime" />
              <SubStat label={t("leados.sources.costPerLead")} value={blendedCpl === null ? "—" : formatCurrency(blendedCpl, "USD", locale)} tone="cyan" />
              <SubStat
                label={t("leados.team.pipelineValue")}
                value={formatCompact(sourceStats.reduce((s, x) => s + x.totalValue, 0), locale)}
                tone="violet"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources table */}
      <Card className="surface-elevated gap-0 overflow-hidden py-0">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <PieIcon className="h-4 w-4 text-cyan" />
          <h3 className="text-sm font-semibold text-foreground">{t("leados.sources.title")}</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-card">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.source")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.sources.leadCount")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.sources.conversionRate")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.sources.costPerLead")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.value")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.runtime.totalCost")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceStats.map((s, i) => {
                const def = SOURCE_BY_ID[s.source];
                const totalCost = s.count * (s.costPerLead ?? 0);
                return (
                  <motion.tr
                    key={s.source}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    className="border-border transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {t(def.labelKey)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-foreground">{s.count}</TableCell>
                    <TableCell className="py-2.5 text-sm text-foreground">
                      {Math.round(s.conversionRate * 100)}%
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-foreground">
                      {s.costPerLead === null ? "—" : formatCurrency(s.costPerLead, "USD", locale)}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm font-medium text-foreground">
                      {formatCurrency(s.totalValue, "USD", locale)}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">
                      {formatCurrency(totalCost, "USD", locale)}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pie + bar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="surface-elevated">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <PieIcon className="h-4 w-4 text-violet" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("leados.sources.distribution")}
            </h3>
          </div>
          <CardContent className="p-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
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
            <div className="grid grid-cols-2 gap-1 text-[11px] uppercase tracking-wider text-muted-foreground sm:grid-cols-3">
              {pieData.map((p, i) => (
                <span key={i} className="flex items-center gap-1.5 truncate">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.fill }} />
                  <span className="truncate">{p.name}</span>
                  <span className="ml-auto text-foreground/60">{p.value}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <TrendingUp className="h-4 w-4 text-lime" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("leados.dashboard.leadsBySource")}
            </h3>
          </div>
          <CardContent className="p-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="source" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                  <Bar dataKey="leads" radius={[4, 4, 0, 0]} barSize={28}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {LEAD_SOURCES.map((s, i) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
            />
            {t(s.labelKey)}
          </span>
        ))}
      </div>
    </div>
  );
}

function SubStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "lime" | "cyan" | "amber" | "rose" | "violet";
}) {
  const cls = toneClasses(tone as StatusTone);
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className={cn("mt-0.5 text-base font-semibold", cls.text)}>{value}</p>
    </div>
  );
}
