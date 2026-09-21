"use client";

/**
 * Control — AiInsightsView.
 *
 * AI-generated insights (mock, deterministic): "3 deals at risk", "Quote
 * Q-1042 expires in 2 days", "Document review backlog growing", "Automation
 * 'Lead assignment' failed 3x". Each with a suggested action + "Ask Owner AI"
 * button (opens owner AI panel via store).
 */

import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, relativeTime, toneClasses } from "@/lib/utils";
import type { AiInsight, InsightTone } from "../types";

const TONE_ICON: Record<InsightTone, LucideIcon> = {
  lime: TrendingUp,
  cyan: Lightbulb,
  amber: AlertTriangle,
  rose: AlertTriangle,
  violet: Sparkles,
};

export function AiInsightsView({ insights }: { insights: AiInsight[] }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const setOwnerAiOpen = useAppStore((s) => s.setOwnerAiOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      {/* Header banner */}
      <div className="surface-elevated flex items-start gap-3 rounded-xl border border-violet/30 bg-violet/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet/40 bg-violet/10">
          <Sparkles className="h-4 w-4 text-violet" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            {t("control.ai.title")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("control.ai.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOwnerAiOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-violet/40 bg-violet/10 px-3 py-1.5 text-xs font-medium text-violet transition-colors hover:bg-violet/20"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {t("control.ai.askOwner")}
        </button>
      </div>

      {/* Insights grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {insights.map((insight) => {
          const Icon = TONE_ICON[insight.tone];
          const cls = toneClasses(insight.tone);
          return (
            <article
              key={insight.id}
              className="surface-elevated group flex flex-col gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:border-border"
            >
              <header className="flex items-start gap-3">
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                  cls.bg, cls.border,
                )}>
                  <Icon className={cn("h-4 w-4", cls.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {insight.title}
                    </h4>
                    <span className="shrink-0 text-[10px] text-muted-foreground/70">
                      {relativeTime(insight.ts, locale)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {insight.body}
                  </p>
                </div>
              </header>

              <footer className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />
                    {(insight.confidence * 100).toFixed(0)}% {t("control.ai.confidence")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveModule(insight.moduleId)}
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/40"
                  >
                    {t(insight.actionKey)}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerAiOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md border border-violet/40 bg-violet/10 px-2.5 py-1 text-[11px] font-medium text-violet transition-colors hover:bg-violet/20"
                    aria-label={t("control.ai.askOwner")}
                  >
                    <MessageSquare className="h-3 w-3" />
                  </button>
                </div>
              </footer>
            </article>
          );
        })}
        {insights.length === 0 ? (
          <div className="col-span-full surface-elevated rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            {t("control.ai.empty")}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
