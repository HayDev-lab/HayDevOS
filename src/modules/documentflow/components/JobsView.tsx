"use client";

/**
 * JobsView — durable pipeline jobs table + worker pool status.
 *
 * Worker pool summary card shows N workers (idle/busy) and queue depth.
 * Jobs table: type, status, document, worker, started, duration, retries.
 * Filter by status.
 */

import * as React from "react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Activity,
  Server,
  Clock,
  RotateCw,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  type DocJob,
  type DocWorker,
  type JobStatus,
} from "../data";
import {
  JobStatusBadge,
  JobTypePill,
  formatDuration,
} from "../shared";

const STATUSES: JobStatus[] = ["queued", "running", "success", "failed", "retrying"];

export function JobsView({
  jobs,
  workers,
}: {
  jobs: DocJob[];
  workers: DocWorker[];
}) {
  const { t, locale } = useLocale();
  const [filter, setFilter] = useState<JobStatus | "all">("all");

  const filtered = useMemo(() => {
    return jobs
      .filter((j) => filter === "all" || j.status === filter)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [jobs, filter]);

  const busy = workers.filter((w) => w.status === "busy").length;
  const idle = workers.filter((w) => w.status === "idle").length;
  const queueDepth = jobs.filter((j) => j.status === "queued").length;
  const running = jobs.filter((j) => j.status === "running").length;
  const failed = jobs.filter((j) => j.status === "failed").length;

  return (
    <div className="space-y-4">
      {/* Worker pool status */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="surface-elevated">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
              <Cpu size={16} />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{t("docflow.jobs.workers")}</p>
              <p className="font-mono text-xl font-semibold tabular-nums">{workers.length}</p>
              <p className="text-[10px] text-muted-foreground">
                <span className="text-amber">{busy} {t("docflow.jobs.busy")}</span>
                {" · "}
                <span className="text-lime">{idle} {t("docflow.jobs.idle")}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-elevated">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 items-center justify-center rounded-lg border border-amber/30 bg-amber/10 text-amber">
              <Clock size={16} />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{t("docflow.jobs.queueDepth")}</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-amber">{queueDepth}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-elevated">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan">
              <Activity size={16} className="animate-pulse" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{t("docflow.status.running")}</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-cyan">{running}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="surface-elevated">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-9 items-center justify-center rounded-lg border border-rose/30 bg-rose/10 text-rose">
              <Server size={16} />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{t("docflow.status.failed")}</p>
              <p className="font-mono text-xl font-semibold tabular-nums text-rose">{failed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker chips */}
      <div className="surface-elevated flex flex-wrap items-center gap-2 rounded-xl p-3">
        <span className="mr-1 text-xs font-medium text-muted-foreground">{t("docflow.jobs.workers")}:</span>
        {workers.map((w) => (
          <span
            key={w.id}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-mono",
              w.status === "busy"
                ? "border-amber/30 bg-amber/10 text-amber"
                : "border-border bg-muted text-muted-foreground",
            )}
            title={w.currentJob ? `Running ${w.currentJob}` : "Idle"}
          >
            <span className={cn("size-1.5 rounded-full", w.status === "busy" ? "bg-amber animate-pulse-dot" : "bg-lime")} />
            {w.id}
          </span>
        ))}
      </div>

      {/* Jobs table */}
      <div className="surface-elevated overflow-hidden rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <h3 className="text-sm font-medium">{t("docflow.jobs.title")}</h3>
          <Select value={filter} onValueChange={(v) => setFilter(v as JobStatus | "all")}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("docflow.inbox.allStatuses")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`docflow.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1.4fr)_auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>{t("docflow.jobs.type")}</span>
          <span>Document</span>
          <span>{t("docflow.inbox.status")}</span>
          <span className="hidden md:inline">{t("docflow.jobs.worker")}</span>
          <span className="hidden lg:inline">{t("docflow.jobs.started")}</span>
          <span className="hidden sm:inline">{t("docflow.jobs.duration")}</span>
          <span className="text-right">{t("docflow.jobs.retries")}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {t("docflow.jobs.empty")}
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh]">
            <div className="divide-y divide-border">
              {filtered.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.012, 0.3) }}
                  className="grid grid-cols-[auto_minmax(0,1.4fr)_auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <JobTypePill type={job.type} />
                  <div className="min-w-0">
                    <span className="truncate text-sm font-medium">{job.documentName}</span>
                    <div className="font-mono text-[10px] text-muted-foreground">{job.documentId}</div>
                  </div>
                  <JobStatusBadge status={job.status} />
                  <div className="hidden items-center gap-1.5 md:flex">
                    <span className={cn(
                      "font-mono text-xs",
                      job.worker === "—" ? "text-muted-foreground" : "text-foreground/80",
                    )}>
                      {job.worker}
                    </span>
                    {job.status === "running" && (
                      <RotateCw size={10} className="animate-spin text-cyan" />
                    )}
                  </div>
                  <span className="hidden text-xs text-muted-foreground lg:inline">
                    {formatDateTime(job.startedAt, locale)}
                    <span className="ml-1 text-[10px] opacity-70">{relativeTime(job.startedAt, locale)}</span>
                  </span>
                  <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                    {formatDuration(job.durationMs)}
                  </span>
                  <span className="text-right">
                    {job.retries > 0 ? (
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-mono",
                        job.retries >= 2 ? "bg-rose/10 text-rose border-rose/30" : "bg-amber/10 text-amber border-amber/30",
                      )}>
                        ×{job.retries}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
