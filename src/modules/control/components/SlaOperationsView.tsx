"use client";

/**
 * Control — SlaOperationsView.
 *
 * SLA / operations: first response breaches, follow-up breaches, stage
 * inactivity, worker backlog, processing failures. Clickable → source modules.
 */

import { motion } from "framer-motion";
import { AlertOctagon, Clock, AlertTriangle, Server, Activity } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, relativeTime, toneClasses } from "@/lib/utils";
import type { SlaOperationsSummary } from "../types";
import { KpiCard } from "./KpiCard";

export function SlaOperationsView({ summary }: { summary: SlaOperationsSummary }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

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
        {/* SLA breaches */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-rose" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.sla.breaches")}
            </h3>
            <span className="ml-auto rounded-full border border-rose/30 bg-rose/10 px-2 py-0.5 text-[10px] font-medium text-rose">
              {summary.slaBreaches.length}
            </span>
          </header>
          <ul className="space-y-2">
            {summary.slaBreaches.map((b) => (
              <li
                key={b.id}
                className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {b.leadName}
                    </span>
                    {b.company ? (
                      <span className="truncate text-[10px] text-muted-foreground/80">
                        {b.company}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                    {t("control.sla.hoursOver")}: {b.hoursOver}h · {t("control.sales.owner")}: {b.ownerId}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-rose/30 bg-rose/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose">
                  +{b.hoursOver}h
                </span>
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
            {summary.slaBreaches.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.sla.noBreaches")}
              </li>
            ) : null}
          </ul>
        </section>

        {/* Stage inactivity */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.sla.inactivity")}
            </h3>
            <span className="ml-auto rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber">
              {summary.stageInactivity.length}
            </span>
          </header>
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {summary.stageInactivity.map((d) => {
              const tone = d.daysIdle >= 14 ? "rose" : "amber";
              const cls = toneClasses(tone);
              return (
                <li
                  key={d.id}
                  className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {d.leadName}
                      </span>
                      <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {d.stage}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                      {t("control.sla.lastActivity")}: {relativeTime(d.lastActivityAt, locale)}
                    </p>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                    cls.bg, cls.border, cls.text,
                  )}>
                    {d.daysIdle}d
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModule("leados")}
                    className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                    aria-label={t("control.attention.open")}
                  >
                    {t("control.attention.open")}
                  </button>
                </li>
              );
            })}
            {summary.stageInactivity.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.sla.noInactivity")}
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Worker backlog */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Server className="h-4 w-4 text-violet" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.sla.workerBacklog")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.workerBacklog.map((w) => {
              const tone = w.queueDepth >= 5 ? "rose" : w.queueDepth >= 3 ? "amber" : "cyan";
              const cls = toneClasses(tone);
              return (
                <li
                  key={w.workerId}
                  className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {w.name}
                      </span>
                      <span className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        cls.bg, cls.border, cls.text,
                      )}>
                        {w.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", cls.dot)} style={{ width: `${Math.min(100, w.queueDepth * 20)}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {w.queueDepth} queued
                      </span>
                    </div>
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
              );
            })}
            {summary.workerBacklog.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.sla.noBacklog")}
              </li>
            ) : null}
          </ul>
        </section>

        {/* Processing failures */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-rose" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.sla.processingFailures")}
            </h3>
            <span className="ml-auto rounded-full border border-rose/30 bg-rose/10 px-2 py-0.5 text-[10px] font-medium text-rose">
              {summary.processingFailures.length}
            </span>
          </header>
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {summary.processingFailures.map((f) => (
              <li
                key={f.id}
                className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">{f.source}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
                    {f.message}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground/70">
                  {relativeTime(f.ts, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModule(f.source === "Autopilot" ? "autopilot" : "docsmart")}
                  className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                  aria-label={t("control.attention.open")}
                >
                  {t("control.attention.open")}
                </button>
              </li>
            ))}
            {summary.processingFailures.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.sla.noFailures")}
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </motion.div>
  );
}
