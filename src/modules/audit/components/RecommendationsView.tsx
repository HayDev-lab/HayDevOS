"use client";

/**
 * RecommendationsView — prioritized recommendations.
 *
 * For the given report, we look at the gap refs and surface the recommendation
 * templates whose `triggerRefs` intersect with those gaps. Each recommendation
 * shows:
 *  - priority (rank + impact)
 *  - title
 *  - rationale tied to specific answer refs (evidence chips)
 *  - recommended HayDev module (click → setActiveModule)
 *  - qualitative effort + impact
 *
 * "Open module" action wires into the registry via `useAppStore.setActiveModule`.
 */

import { motion } from "framer-motion";
import {
  Lightbulb,
  ArrowRight,
  Clock,
  Target,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { pickL10n, type AuditReport, type Impact } from "../types";
import { prioritize } from "../data";
import { ImpactBadge, TONE_BG, TONE_TEXT } from "./shared";

interface Props {
  report: AuditReport;
}

const EFFORT_LABEL_KEY: Record<"low" | "medium" | "high", string> = {
  low: "audit.effort.low",
  medium: "audit.effort.medium",
  high: "audit.effort.high",
};

const EFFORT_ICON: Record<"low" | "medium" | "high", LucideIcon> = {
  low: Sparkles,
  medium: Clock,
  high: Target,
};

export function RecommendationsView({ report }: Props) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const ranked = prioritize(report.gaps);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-rose" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("audit.recommendations.title")}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {t("audit.recommendations.sub")}
          </p>
        </div>
      </header>

      {ranked.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-center text-xs text-muted-foreground">
          {t("audit.recommendations.empty")}
        </div>
      ) : (
        <ol className="space-y-3">
          {ranked.map((rec, idx) => {
            const tpl = rec.template;
            const EffortIcon = EFFORT_ICON[tpl.effort];
            const priorityTone = priorityToneFor(rec.priority);
            return (
              <motion.li
                key={tpl.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.04 }}
                className="surface-elevated rounded-xl border border-border/60 p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Priority rank */}
                  <div
                    className={cn(
                      "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm font-semibold",
                      TONE_BG[priorityTone],
                      TONE_TEXT[priorityTone],
                    )}
                  >
                    #{idx + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {pickL10n(tpl.title, locale)}
                      </h3>
                      <ImpactBadge impact={tpl.impact} />
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          TONE_BG[priorityTone],
                          TONE_TEXT[priorityTone],
                        )}
                      >
                        <EffortIcon className="h-3 w-3" />
                        {t(EFFORT_LABEL_KEY[tpl.effort])}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {pickL10n(tpl.rationale, locale)}
                    </p>

                    {/* Triggered-by refs (evidence chips) */}
                    {rec.triggeredBy.length > 0 ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {t("audit.recommendations.evidence")}
                        </span>
                        {rec.triggeredBy.map((ref) => (
                          <span
                            key={ref}
                            className="rounded-md border border-border/60 bg-card/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Open module action */}
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          {t("audit.recommendations.recommendedModule")}
                        </span>
                        <div className="text-xs font-medium text-foreground">
                          {t(`module.${tpl.moduleId}`)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveModule(tpl.moduleId)}
                        className="h-7 gap-1 border-border/60 text-foreground"
                      >
                        {t("audit.recommendations.openModule")}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}

      {/* Footnote: deterministic, no LLM mutation */}
      <p className="rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-[10px] text-muted-foreground/80">
        {t("audit.recommendations.footnote")}
      </p>
    </div>
  );
}

function priorityToneFor(priority: number): "rose" | "amber" | "cyan" {
  if (priority >= 6) return "rose";
  if (priority >= 3) return "amber";
  return "cyan";
}
