"use client";

/**
 * LeadOS — Team tab.
 *
 * Team members with lead counts, conversion rates, workload bars, and pipeline
 * value cards.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  Trophy,
  Briefcase,
  Activity,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency, formatCompact, toneClasses, type StatusTone } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  allLeads,
  getTeamStats,
  TEAM_MEMBERS,
  TEAM_BY_ID,
} from "../data";
import { OwnerAvatar } from "./shared";

export function TeamView() {
  const { t } = useLocale();
  const teamStats = useMemo(() => getTeamStats(allLeads), []);

  const totals = useMemo(() => {
    const openLeads = teamStats.reduce((s, m) => s + m.openLeads, 0);
    const wonLeads = teamStats.reduce((s, m) => s + m.wonLeads, 0);
    const pipelineValue = teamStats.reduce((s, m) => s + m.pipelineValue, 0);
    const wonValue = teamStats.reduce((s, m) => s + m.wonValue, 0);
    const avgWinRate = teamStats.length > 0 ? teamStats.reduce((s, m) => s + m.winRate, 0) / teamStats.length : 0;
    return { openLeads, wonLeads, pipelineValue, wonValue, avgWinRate };
  }, [teamStats]);

  return (
    <div className="flex flex-col gap-6">
      {/* Team summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryKpi icon={Users} label={t("leados.team.leadCount")} value={String(totals.openLeads)} tone="lime" />
        <SummaryKpi icon={Trophy} label={t("leados.team.winRate")} value={`${Math.round(totals.avgWinRate * 100)}%`} tone="cyan" />
        <SummaryKpi
          icon={Briefcase}
          label={t("leados.team.pipelineValue")}
          value={formatCompact(totals.pipelineValue)}
          tone="violet"
        />
        <SummaryKpi
          icon={TrendingUp}
          label={t("leados.analytics.dealsClosed")}
          value={`${totals.wonLeads} · ${formatCompact(totals.wonValue)}`}
          tone="amber"
        />
      </div>

      {/* Team grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teamStats.map((m, i) => (
          <motion.div
            key={m.ownerId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          >
            <Card className="surface-elevated">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <OwnerAvatar ownerId={m.ownerId} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {TEAM_BY_ID[m.ownerId]?.email}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-1 border-border bg-muted/40 px-1.5 py-0 text-[10px] uppercase tracking-wider text-muted-foreground"
                    >
                      {TEAM_BY_ID[m.ownerId]?.role}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Stat label={t("leados.team.leadCount")} value={String(m.openLeads)} tone="lime" />
                  <Stat label={t("leados.team.winRate")} value={`${Math.round(m.winRate * 100)}%`} tone="cyan" />
                  <Stat label={t("leados.team.pipelineValue")} value={formatCompact(m.pipelineValue)} tone="violet" />
                  <Stat label={t("leados.analytics.dealsClosed")} value={String(m.wonLeads)} tone="amber" />
                </div>

                {/* Workload bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {t("leados.team.workload")}
                    </span>
                    <span>{m.workload}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        m.workload > 80 ? "bg-rose" : m.workload > 50 ? "bg-amber" : "bg-lime",
                      )}
                      style={{ width: `${m.workload}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detailed table */}
      <Card className="surface-elevated gap-0 overflow-hidden py-0">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Users className="h-4 w-4 text-lime" />
          <h3 className="text-sm font-semibold text-foreground">{t("leados.analytics.teamPerformance")}</h3>
        </div>
        <ScrollArea className="max-h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.table.owner")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.kpi.totalLeads")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.team.leadCount")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.analytics.dealsClosed")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.team.winRate")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leados.team.pipelineValue")}
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Won
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats.map((m) => (
                <TableRow key={m.ownerId} className="border-border">
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <OwnerAvatar ownerId={m.ownerId} size="xs" />
                      <span className="text-sm font-medium text-foreground">{m.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">{m.totalLeads}</TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">{m.openLeads}</TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">{m.wonLeads}</TableCell>
                  <TableCell className="py-2.5 text-sm text-foreground">
                    {Math.round(m.winRate * 100)}%
                  </TableCell>
                  <TableCell className="py-2.5 text-sm font-medium text-foreground">
                    {formatCurrency(m.pipelineValue, "USD")}
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">
                    {formatCurrency(m.wonValue, "USD")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {TEAM_MEMBERS.length} members · {totals.openLeads} open leads
      </div>
    </div>
  );
}

function SummaryKpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: "lime" | "cyan" | "amber" | "violet";
}) {
  const cls = toneClasses(tone as StatusTone);
  return (
    <Card className="surface-elevated gap-0 py-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", cls.bg, cls.text)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="truncate text-base font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "lime" | "cyan" | "amber" | "violet";
}) {
  const cls = toneClasses(tone as StatusTone);
  return (
    <div className="rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold", cls.text)}>{value}</p>
    </div>
  );
}
