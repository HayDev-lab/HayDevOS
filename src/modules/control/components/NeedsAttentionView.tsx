"use client";

/**
 * Control — NeedsAttentionView.
 *
 * Full prioritized list of attention items (CRITICAL → HIGH → MEDIUM → INFO).
 * Filters by priority + source module. Each row has an "Open" button that
 * drilldowns into the source module via `useAppStore.setActiveModule`.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  Filter,
  type LucideIcon,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, relativeTime, toneClasses } from "@/lib/utils";
import type { AttentionItem, Priority, SourceModule } from "../types";
import { PriorityBadge } from "./KpiCard";

const TYPE_ICON: Record<string, LucideIcon> = {
  sla_breach: AlertOctagon,
  overdue_followup: Clock,
  stale_high_value_deal: AlertTriangle,
  expiring_quote: Clock,
  approval_pending: Clock,
  document_review: Info,
  processing_failure: AlertTriangle,
  automation_failure: AlertTriangle,
  worker_backlog: AlertTriangle,
  integration_reauth: AlertTriangle,
  invoice_erp_alert: AlertTriangle,
  ai_approval: Info,
};

const PRIORITY_RANK: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 };

const PRIORITY_TONE: Record<Priority, "rose" | "amber" | "cyan" | "muted"> = {
  CRITICAL: "rose",
  HIGH: "amber",
  MEDIUM: "cyan",
  INFO: "muted",
};

const SOURCE_MODULES: { id: SourceModule; labelKey: string }[] = [
  { id: "leados", labelKey: "module.leados" },
  { id: "quoteflow", labelKey: "module.quoteflow" },
  { id: "docsmart", labelKey: "module.docsmart" },
  { id: "autopilot", labelKey: "module.autopilot" },
  { id: "erphub", labelKey: "module.erphub" },
  { id: "connect", labelKey: "module.connect" },
  { id: "ownerAi", labelKey: "module.ownerAi" },
];

export function NeedsAttentionView({ items }: { items: AttentionItem[] }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<SourceModule | "all">("all");

  const filtered = useMemo(() => {
    return items
      .filter((i) => priorityFilter === "all" || i.priority === priorityFilter)
      .filter((i) => sourceFilter === "all" || i.source === sourceFilter)
      .sort((a, b) => {
        const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (pr !== 0) return pr;
        return new Date(b.ts).getTime() - new Date(a.ts).getTime();
      });
  }, [items, priorityFilter, sourceFilter]);

  const counts = useMemo(() => {
    const c: Record<Priority, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, INFO: 0 };
    for (const i of items) c[i.priority] += 1;
    return c;
  }, [items]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      {/* Filter bar */}
      <div className="surface-elevated flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {t("control.attention.filterBy")}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(["all", "CRITICAL", "HIGH", "MEDIUM", "INFO"] as const).map((p) => {
            const isActive = priorityFilter === p;
            const label = p === "all" ? t("common.all") : p;
            const count = p === "all" ? items.length : counts[p];
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                  isActive
                    ? "border-border bg-muted/60 text-foreground"
                    : "border-border/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {p !== "all" ? (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      toneClasses(PRIORITY_TONE[p]).dot,
                    )}
                    aria-hidden
                  />
                ) : null}
                {label}
                <span className="text-muted-foreground/70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceModule | "all")}
            className="rounded-md border border-border/60 bg-card px-2 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={t("control.attention.sourceFilter")}
          >
            <option value="all">{t("common.all")} ({t("control.attention.sources")})</option>
            {SOURCE_MODULES.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items */}
      <ul className="space-y-2">
        {filtered.map((item) => {
          const Icon = TYPE_ICON[item.type] ?? Info;
          const tone = PRIORITY_TONE[item.priority];
          const cls = toneClasses(tone);
          return (
            <li
              key={item.id}
              className="surface-elevated group flex items-start gap-3 rounded-xl border border-border/50 p-4 transition-colors hover:border-border"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                  cls.bg,
                  cls.border,
                )}
              >
                <Icon className={cn("h-4 w-4", cls.text)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={item.priority} />
                  <h4 className="truncate text-sm font-semibold text-foreground">
                    {item.title}
                  </h4>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.body}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/80">
                  <span>
                    {t("control.kpi.source")}: <span className="font-medium text-muted-foreground">{item.source}</span>
                  </span>
                  {item.entityRef ? (
                    <span className="font-mono">
                      {item.entityRef}
                    </span>
                  ) : null}
                  <span>
                    {item.dueOrAge === "due"
                      ? `${t("control.attention.due")} ${relativeTime(item.ts, locale)}`
                      : `${relativeTime(item.ts, locale)}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule(item.moduleId)}
                className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`${t("control.attention.open")} ${item.title}`}
              >
                {t("control.attention.open")}
                <ArrowRight className="h-3 w-3" />
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="surface-elevated rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            {t("control.attention.empty")}
          </li>
        ) : null}
      </ul>
    </motion.div>
  );
}
