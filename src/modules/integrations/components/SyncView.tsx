"use client";

/**
 * SyncView — sync history + run-now per provider + schedule config.
 *
 * KPI strip: total runs, success rate, avg duration, failed today.
 * Per-provider summary row with "Run sync now" button.
 * Sync runs table: provider, started, duration, records in/out, status, error,
 * triggered-by.
 * Schedule config card: default cron, idempotency window, auto-disable threshold.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import type { SyncRun, Integration, Provider, IntegrationSettings } from "../types";
import { SectionHeader, EmptyState, ProviderIcon } from "../shared";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  runs: SyncRun[];
  integrations: Integration[];
  providers: Provider[];
  settings: IntegrationSettings;
  onRunNow: (integration: Integration) => void;
  onUpdateSettings: (patch: Partial<IntegrationSettings>) => void;
}

export function SyncView({
  runs,
  integrations,
  providers,
  settings,
  onRunNow,
  onUpdateSettings,
}: Props) {
  const { t, locale } = useLocale();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    providers.forEach((p) => map.set(p.id, p));
    return map;
  }, [providers]);

  const kpis = useMemo(() => {
    const total = runs.length;
    const success = runs.filter((r) => r.status === "success").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    const durations = runs.filter((r) => r.durationMs > 0).map((r) => r.durationMs);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    return { total, success, failed, successRate, avgDuration };
  }, [runs]);

  const filteredRuns = useMemo(() => {
    if (statusFilter === "all") return runs;
    return runs.filter((r) => r.status === statusFilter);
  }, [runs, statusFilter]);

  // Per-provider rollup (only show providers that have at least 1 sync run OR are connected)
  const perProvider = useMemo(() => {
    const map = new Map<string, { runs: number; lastRun: SyncRun | null }>();
    integrations.forEach((i) => {
      const provRuns = runs.filter((r) => r.integrationId === i.id);
      map.set(i.id, {
        runs: provRuns.length,
        lastRun: provRuns[0] ?? null,
      });
    });
    return map;
  }, [integrations, runs]);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title={t("integration.sync.title")}
        sub={t("integration.sync.sub")}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SyncStat
          label={t("integration.sync.kpi.total")}
          value={String(kpis.total)}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          tone="cyan"
        />
        <SyncStat
          label={t("integration.sync.kpi.successRate")}
          value={`${kpis.successRate}%`}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="lime"
        />
        <SyncStat
          label={t("integration.sync.kpi.avgDuration")}
          value={`${kpis.avgDuration}ms`}
          icon={<Clock className="h-3.5 w-3.5" />}
          tone="violet"
        />
        <SyncStat
          label={t("integration.sync.kpi.failed")}
          value={String(kpis.failed)}
          icon={<XCircle className="h-3.5 w-3.5" />}
          tone="rose"
        />
      </div>

      {/* Per-provider row with "Run sync now" */}
      <Card className="surface-elevated py-0">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("integration.sync.byProvider")}
          </div>
          <div className="flex flex-col gap-1">
            {integrations.slice(0, 8).map((integration) => {
              const prov = providerById.get(integration.providerId);
              const stats = perProvider.get(integration.id);
              return (
                <div
                  key={integration.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-2"
                >
                  <div className="flex items-center gap-2">
                    {prov && <ProviderIcon provider={prov} size="sm" />}
                    <div>
                      <div className="text-xs font-medium text-foreground">
                        {prov?.name ?? integration.providerId}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {stats?.runs ?? 0} runs ·{" "}
                        {stats?.lastRun
                          ? relativeTime(stats.lastRun.startedAt, locale)
                          : "never"}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onRunNow(integration);
                      toast.success(t("integration.sync.runStarted"));
                    }}
                    className="gap-1.5"
                  >
                    <Play className="h-3 w-3 text-lime" />
                    {t("integration.sync.runNow")}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder={t("integration.sync.filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="success">success</SelectItem>
            <SelectItem value="partial">partial</SelectItem>
            <SelectItem value="failed">failed</SelectItem>
            <SelectItem value="running">running</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-[11px] text-muted-foreground">
          {filteredRuns.length} {t("integration.sync.runs")}
        </div>
      </div>

      {/* Runs table */}
      <Card className="surface-elevated overflow-hidden py-0">
        <ScrollArea className="max-h-[560px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("integration.sync.col.provider")}
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("integration.sync.col.started")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">
                  {t("integration.sync.col.duration")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground md:table-cell">
                  {t("integration.sync.col.records")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:table-cell">
                  {t("integration.sync.col.trigger")}
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("integration.sync.col.status")}
                </TableHead>
                <TableHead className="hidden text-[10px] uppercase tracking-wider text-muted-foreground lg:table-cell">
                  {t("integration.sync.col.error")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRuns.map((run) => {
                const prov = providerById.get(run.providerId);
                return (
                  <TableRow key={run.id} className="border-border text-xs hover:bg-primary/5">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        {prov && <ProviderIcon provider={prov} size="sm" />}
                        <span className="text-foreground">{prov?.name ?? run.providerId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-[11px] text-muted-foreground">
                      <div>{formatDateTime(run.startedAt, locale)}</div>
                      <div className="text-[10px]">{relativeTime(run.startedAt, locale)}</div>
                    </TableCell>
                    <TableCell className="hidden py-2 font-mono text-[11px] text-foreground md:table-cell">
                      {run.durationMs}ms
                    </TableCell>
                    <TableCell className="hidden py-2 text-[11px] text-muted-foreground md:table-cell">
                      {run.recordsIn}→{run.recordsOut}
                    </TableCell>
                    <TableCell className="hidden py-2 sm:table-cell">
                      <Badge
                        variant="outline"
                        className="border-border bg-background/40 px-1.5 py-0 text-[10px] text-muted-foreground"
                      >
                        {run.triggeredBy}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <StatusPill status={run.status} />
                    </TableCell>
                    <TableCell className="hidden max-w-xs py-2 lg:table-cell">
                      {run.error ? (
                        <span className="truncate text-[10px] text-rose">{run.error}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredRuns.length === 0 && (
            <div className="py-6">
              <EmptyState
                icon={<RefreshCw className="h-5 w-5 text-muted-foreground" />}
                message={t("integration.sync.noRuns")}
              />
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Schedule config */}
      <Card className="surface-elevated py-0">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            {t("integration.sync.schedule")}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider">
                {t("integration.sync.defaultCron")}
              </Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-background/40 p-2">
                <Calendar className="h-3.5 w-3.5 text-violet" />
                <code className="font-mono text-[11px] text-foreground">
                  {settings.defaultSyncCron}
                </code>
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider">
                {t("integration.sync.idempotency")}
              </Label>
              <Input
                type="number"
                value={settings.idempotencyWindowSec}
                onChange={(e) =>
                  onUpdateSettings({ idempotencyWindowSec: Number(e.target.value) })
                }
                className="mt-1 font-mono text-xs"
              />
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {t("integration.sync.idempotencyHint")}
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider">
                {t("integration.sync.autoDisable")}
              </Label>
              <Input
                type="number"
                value={settings.autoDisableAfterFailures}
                onChange={(e) =>
                  onUpdateSettings({ autoDisableAfterFailures: Number(e.target.value) })
                }
                className="mt-1 font-mono text-xs"
              />
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {t("integration.sync.autoDisableHint")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-amber/30 bg-amber/5 p-2 text-[10px] text-amber">
            <AlertTriangle className="h-3 w-3" />
            {t("integration.sync.scheduleNote")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncStat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "lime" | "amber" | "rose" | "cyan" | "violet";
}) {
  const cls = {
    lime: "border-lime/30 bg-lime/10 text-lime",
    amber: "border-amber/30 bg-amber/10 text-amber",
    rose: "border-rose/30 bg-rose/10 text-rose",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
    violet: "border-violet/30 bg-violet/10 text-violet",
  }[tone];
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border p-3", cls)}>
      {icon}
      <div>
        <div className="text-lg font-semibold leading-none text-foreground">{value}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SyncRun["status"] }) {
  const cls =
    status === "success"
      ? "bg-success/15 text-success border-success/30"
      : status === "partial"
        ? "bg-amber/15 text-amber border-amber/30"
        : status === "running"
          ? "bg-cyan/15 text-cyan border-cyan/30"
          : "bg-rose/15 text-rose border-rose/30";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0 text-[9px] font-medium uppercase",
        cls,
      )}
    >
      {status}
    </span>
  );
}

export default SyncView;
