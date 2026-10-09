"use client";

/**
 * WorkersView — worker pool status board.
 * Status (online/offline/draining), current job, queue depth, heartbeat,
 * region, jobs processed, CPU%.
 */

import { Card,CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/lib/i18n";
import { cn,relativeTime,statusColor,toneClasses } from "@/lib/utils";
import { motion } from "framer-motion";
import { Activity,Cpu,HeartPulse,MapPin,Server } from "lucide-react";
import type { Worker } from "../types";

interface Props {
  workers: Worker[];
}

export function WorkersView({ workers }: Props) {
  const { t, locale } = useLocale();

  const online = workers.filter((w) => w.status === "online").length;
  const draining = workers.filter((w) => w.status === "draining").length;
  const offline = workers.filter((w) => w.status === "offline").length;
  const queueTotal = workers.reduce((sum, w) => sum + w.queueDepth, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("automation.workers.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground/80">{t("automation.workers.sub")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatPill tone="lime" label={t("automation.workers.status.online")} value={online} />
          <StatPill tone="amber" label={t("automation.workers.status.draining")} value={draining} />
          <StatPill tone="rose" label={t("automation.workers.status.offline")} value={offline} />
          <StatPill tone="cyan" label={t("automation.workers.col.queue")} value={queueTotal} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((w, i) => {
          const tone = statusColor(w.status === "online" ? "active" : w.status === "draining" ? "paused" : "disconnected");
          const cls = toneClasses(tone);
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: Math.min(i * 0.03, 0.2) }}
            >
              <Card className="surface-elevated py-0">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md",
                          cls.bg,
                          cls.text,
                        )}
                      >
                        <Server className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-mono text-sm font-semibold text-foreground">{w.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {w.region}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                        cls.border,
                        cls.bg,
                        cls.text,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot, w.status === "online" && "animate-pulse-dot")} />
                      {t(`automation.workers.status.${w.status}`)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-border bg-background/40 p-2">
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        {t("automation.workers.col.current")}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-foreground">
                        {w.currentJob ?? t("automation.workers.idle")}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-background/40 p-2">
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <HeartPulse className="h-3 w-3" />
                        {t("automation.workers.col.heartbeat")}
                      </div>
                      <div className="mt-0.5 text-[11px] text-foreground">
                        {relativeTime(w.heartbeatAt, locale)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t("automation.workers.col.queue")}
                      </div>
                      <div className="text-sm font-semibold text-amber">{w.queueDepth}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t("automation.workers.col.processed")}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {w.jobsProcessed.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> {t("automation.workers.col.cpu")}
                      </span>
                      <span
                        className={cn(
                          "font-mono",
                          w.cpuPct > 80 ? "text-rose" : w.cpuPct > 50 ? "text-amber" : "text-success",
                        )}
                      >
                        {w.cpuPct}%
                      </span>
                    </div>
                    <Progress
                      value={w.cpuPct}
                      className="h-1.5 bg-muted"
                      // tint the bar via inline style — Progress's indicator uses --primary by default
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({
  tone,
  label,
  value,
}: {
  tone: "lime" | "amber" | "rose" | "cyan";
  label: string;
  value: number;
}) {
  const cls = {
    lime: { border: "border-lime/30", bg: "bg-lime/10", text: "text-lime" },
    amber: { border: "border-amber/30", bg: "bg-amber/10", text: "text-amber" },
    rose: { border: "border-rose/30", bg: "bg-rose/10", text: "text-rose" },
    cyan: { border: "border-cyan/30", bg: "bg-cyan/10", text: "text-cyan" },
  }[tone];
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs", cls.border, cls.bg, cls.text)}>
      <span className="font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export default WorkersView;
