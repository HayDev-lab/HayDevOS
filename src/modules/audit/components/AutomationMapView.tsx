"use client";

/**
 * AutomationMapView — visual map of current automation maturity across the
 * business processes surfaced by the audit.
 *
 * For each process anchored in `scoring.ts` (lead_capture, sales_followups,
 * document_intake, order_to_invoice, payment_tracking, automation_catalog,
 * ai_use_cases), we render a card showing:
 *  - process name
 *  - current maturity (manual / assisted / automated / optimized)
 *  - target maturity (the next step up)
 *  - the gap to close
 *  - related module + impact
 *
 * Plus a maturity legend at the top and a "matrix" grid where each process is
 * plotted on a 4-column maturity axis (manual → optimized), so the user can
 * see where they sit at a glance.
 */

import { motion } from "framer-motion";
import { Map as MapIcon, ArrowRight, Workflow } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { auditModuleNameKey } from "../scoring";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";

import {
  MATURITY_ORDER,
  MATURITY_TONE,
  pickL10n,
  type AuditReport,
  type Maturity,
} from "../types";
import { ImpactBadge, MaturityBadge, TONE_BG, TONE_COLOR, TONE_TEXT } from "./shared";

interface Props {
  report: AuditReport;
}

export function AutomationMapView({ report }: Props) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const opportunities = report.opportunities;

  // Counts per maturity level — for the summary strip.
  const counts = MATURITY_ORDER.reduce<Record<Maturity, number>>(
    (acc, m) => {
      acc[m] = opportunities.filter((o) => o.current === m).length;
      return acc;
    },
    { manual: 0, assisted: 0, automated: 0, optimized: 0 },
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <MapIcon className="h-4 w-4 text-rose" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("audit.automationMap.title")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t("audit.automationMap.sub")}
          </p>
        </div>
      </header>

      {/* Summary strip — counts per maturity */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MATURITY_ORDER.map((m) => (
          <div
            key={m}
            className={cn(
              "rounded-lg border p-3",
              TONE_BG[MATURITY_TONE[m]],
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t(`audit.maturity.${m}`)}
              </span>
              <span
                className={cn("text-lg font-semibold tabular-nums", TONE_TEXT[MATURITY_TONE[m]])}
              >
                {counts[m]}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground/80">
              {t(`audit.maturity.${m}.desc`)}
            </div>
          </div>
        ))}
      </div>

      {/* Maturity matrix — columns = maturity stages, rows = processes */}
      <section className="surface-elevated rounded-xl border border-border/60 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {t("audit.automationMap.matrixTitle")}
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {t("audit.automationMap.matrixSub")}
          </span>
        </header>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Column headers */}
            <div
              className="grid gap-2 border-b border-border/60 pb-2"
              style={{ gridTemplateColumns: `220px repeat(4, 1fr)` }}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t("audit.automationMap.colProcess")}
              </div>
              {MATURITY_ORDER.map((m) => (
                <div
                  key={m}
                  className={cn("text-center text-[10px] font-medium uppercase tracking-wider", TONE_TEXT[MATURITY_TONE[m]])}
                >
                  {t(`audit.maturity.${m}`)}
                </div>
              ))}
            </div>

            {/* Rows */}
            <ul className="divide-y divide-border/40">
              {opportunities.length === 0 ? (
                <li className="py-6 text-center text-xs text-muted-foreground">
                  {t("audit.automationMap.empty")}
                </li>
              ) : (
                opportunities.map((op, idx) => {
                  const currentIdx = MATURITY_ORDER.indexOf(op.current);
                  const targetIdx = MATURITY_ORDER.indexOf(op.target);
                  return (
                    <li
                      key={op.id}
                      className="grid items-center gap-2 py-2.5"
                      style={{ gridTemplateColumns: `220px repeat(4, 1fr)` }}
                    >
                      {/* Process name + impact */}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => op.relatedModule && setActiveModule(op.relatedModule)}
                          className="group flex items-center gap-1.5 text-left"
                        >
                          <span className="truncate text-xs font-medium text-foreground">
                            {pickL10n(op.processLabel, locale)}
                          </span>
                          {op.relatedModule ? (
                            <Workflow className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          ) : null}
                        </button>
                        <div className="mt-0.5">
                          <ImpactBadge impact={op.impact} />
                        </div>
                      </div>

                      {/* Maturity cells */}
                      {MATURITY_ORDER.map((m, i) => {
                        const isCurrent = i === currentIdx;
                        const isTarget = i === targetIdx && op.target !== op.current;
                        const isPast = i < currentIdx;
                        return (
                          <div key={m} className="flex items-center justify-center">
                            {isCurrent ? (
                              <motion.div
                                initial={{ scale: 0.85 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.2, delay: idx * 0.04 }}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
                                  TONE_BG[MATURITY_TONE[m]],
                                  TONE_TEXT[MATURITY_TONE[m]],
                                )}
                                title={t(`audit.maturity.${m}`)}
                              >
                                ●
                              </motion.div>
                            ) : isTarget ? (
                              <div
                                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed text-[10px] text-muted-foreground"
                                title={t("audit.automationMap.target")}
                              >
                                ○
                              </div>
                            ) : isPast ? (
                              <div
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: TONE_COLOR[MATURITY_TONE[m]] }}
                                aria-hidden
                              />
                            ) : (
                              <div className="h-1.5 w-1.5 rounded-full bg-muted" aria-hidden />
                            )}
                          </div>
                        );
                      })}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-lime/40 bg-lime/10 text-[8px] text-lime">●</span>
            {t("audit.automationMap.legendCurrent")}
          </span>
          <span className="flex items-center gap-1">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-dashed text-[8px]">○</span>
            {t("audit.automationMap.legendTarget")}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            {t("audit.automationMap.legendPast")}
          </span>
        </div>
      </section>

      {/* Detailed cards */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {t("audit.automationMap.detailTitle")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((op) => (
            <div
              key={op.id}
              className="surface-elevated rounded-xl border border-border/60 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {pickL10n(op.processLabel, locale)}
                </h4>
                <ImpactBadge impact={op.impact} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pickL10n(op.rationale, locale)}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <MaturityBadge maturity={op.current} />
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <MaturityBadge maturity={op.target} />
              </div>
              {op.relatedModule ? (
                <button
                  type="button"
                  onClick={() => setActiveModule(op.relatedModule!)}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] text-cyan hover:text-cyan/80"
                >
                  {t(auditModuleNameKey(op.relatedModule))}
                  <ArrowRight className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
