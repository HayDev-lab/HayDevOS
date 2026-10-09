"use client";

/**
 * Control — ExecutiveSnapshot.
 *
 * The hero dashboard: KPI grid, attention feed, and module health.
 *
 * Every KPI card drilldowns into its source module via `useAppStore.setActiveModule`.
 */

import { motion } from "framer-motion";
import {
Activity,
AlertTriangle,
ArrowRight,
DollarSign,
FileText,
Percent,
Plug,
Receipt,
ScanLine,
TrendingUp,
Trophy,
Users,
Workflow,
type LucideIcon,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn,relativeTime,toneClasses } from "@/lib/utils";
import type { ModuleHealth,ExecutiveSnapshot as Snapshot } from "../types";
import { KpiCard,PriorityBadge } from "./KpiCard";

const KPI_ICONS: Record<string, LucideIcon> = {
  "kpi-revenue": DollarSign,
  "kpi-pipeline": TrendingUp,
  "kpi-active-leads": Users,
  "kpi-won-deals": Trophy,
  "kpi-quote-sent-value": FileText,
  "kpi-accept-rate": Percent,
  "kpi-doc-review": ScanLine,
  "kpi-auto-failures": Workflow,
  "kpi-sla-breaches": AlertTriangle,
  "kpi-overdue-inv": Receipt,
  "kpi-int-health": Plug,
};

const HEALTH_TONE: Record<ModuleHealth, "lime" | "amber" | "rose" | "muted"> = {
  healthy: "lime",
  warning: "amber",
  critical: "rose",
  offline: "muted",
};

const HEALTH_DOT: Record<ModuleHealth, string> = {
  healthy: "bg-lime",
  warning: "bg-amber",
  critical: "bg-rose",
  offline: "bg-muted-foreground",
};

export function ExecutiveSnapshot({ snapshot }: { snapshot: Snapshot }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* KPI grid — responsive 2 / 3 / 4 columns */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {snapshot.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} icon={KPI_ICONS[kpi.id]} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Needs attention top 5 */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber" />
              <h3 className="text-sm font-semibold text-foreground">
                {t("control.snapshot.needsAttention")}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule("control")}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("control.snapshot.viewAll")}
              <ArrowRight className="h-3 w-3" />
            </button>
          </header>
          <ul className="space-y-2">
            {snapshot.attentionTop.map((item) => (
              <li
                key={item.id}
                className="group flex items-start gap-3 rounded-lg border border-border/40 bg-card/40 p-3 transition-colors hover:border-border hover:bg-muted/30"
              >
                <div className="mt-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={item.priority} />
                    <span className="truncate text-xs font-medium text-foreground">
                      {item.title}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.body}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {t("control.kpi.source")}: {item.source} ·{" "}
                    {item.dueOrAge === "due"
                      ? `${t("control.attention.due")} ${relativeTime(item.ts, locale)}`
                      : `${relativeTime(item.ts, locale)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule(item.moduleId)}
                  className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                  aria-label={t("control.attention.open")}
                >
                  {t("control.attention.open")}
                </button>
              </li>
            ))}
            {snapshot.attentionTop.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.attention.empty")}
              </li>
            ) : null}
          </ul>
        </section>

      </div>

      {/* Module health grid */}
      <section className="surface-elevated rounded-xl border border-border/60 p-4">
        <header className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-lime" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("control.snapshot.moduleHealth")}
          </h3>
        </header>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {snapshot.moduleHealth.map((m) => {
            const tone = HEALTH_TONE[m.health];
            const cls = toneClasses(tone);
            return (
              <button
                key={m.moduleId}
                type="button"
                onClick={() => setActiveModule(m.moduleId)}
                className="group flex flex-col gap-1.5 rounded-lg border border-border/50 bg-card/40 p-3 text-left transition-all hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-medium text-foreground">
                    {t(m.nameKey)}
                  </span>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", HEALTH_DOT[m.health])} aria-hidden />
                </div>
                <p className={cn("truncate text-[10px] font-medium", cls.text)}>
                  {m.summary}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", cls.dot)}
                      style={{ width: `${Math.max(0, Math.round(m.score * 100))}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">
                    {Math.round(m.score * 100)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
