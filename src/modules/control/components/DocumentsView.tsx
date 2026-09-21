"use client";

/**
 * Control — DocumentsView.
 *
 * Document drilldown: awaiting review, processing, failed, avg confidence.
 * Clickable → DocumentFlow.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScanLine, FileText, AlertTriangle } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, relativeTime, toneClasses } from "@/lib/utils";
import type { DocumentSummary } from "../types";
import { KpiCard } from "./KpiCard";

const STATUS_TONE: Record<string, "lime" | "cyan" | "amber" | "rose" | "violet"> = {
  pending: "amber",
  processing: "cyan",
  classified: "cyan",
  extracted: "cyan",
  reviewed: "lime",
  approved: "lime",
  rejected: "rose",
};

const CLASS_LABEL: Record<string, string> = {
  invoice: "Invoice",
  contract: "Contract",
  receipt: "Receipt",
  id: "ID",
  form: "Form",
  other: "Other",
};

export function DocumentsView({ summary }: { summary: DocumentSummary }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const statusData = useMemo(() => summary.byStatus, [summary.byStatus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {summary.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By status */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.documents.byStatus")}
            </h3>
          </header>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" vertical={false} />
                <XAxis dataKey="status" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {statusData.map((s, i) => (
                    <Cell key={i} fill={`var(--accent-${STATUS_TONE[s.status] ?? "cyan"})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-muted-foreground sm:grid-cols-4">
            {summary.byStatus.map((s) => (
              <button
                key={s.status}
                type="button"
                onClick={() => setActiveModule("docsmart")}
                className="flex items-center justify-between gap-1 rounded border border-transparent px-1 py-0.5 hover:border-border/60 hover:bg-muted/30"
              >
                <span className="flex items-center gap-1 truncate">
                  <span className={cn("h-1.5 w-1.5 rounded-full", toneClasses(STATUS_TONE[s.status] ?? "cyan").dot)} />
                  {t(s.labelKey)}
                </span>
                <span className="font-mono">{s.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* By classification */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.documents.byClass")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.byClass.map((c) => {
              const pct = Math.round(c.avgConfidence * 100);
              const tone = pct >= 90 ? "lime" : pct >= 75 ? "cyan" : "amber";
              const cls = toneClasses(tone);
              return (
                <li
                  key={c.cls ?? "unclassified"}
                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-medium text-foreground">
                        {c.cls ? CLASS_LABEL[c.cls] ?? c.cls : t("control.documents.unclassified")}
                      </span>
                      <span className="font-mono text-xs text-foreground">{c.count}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", cls.dot)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={cn("text-[10px] font-medium", cls.text)}>
                        {pct}% conf
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Awaiting review list */}
      <section className="surface-elevated rounded-xl border border-border/60 p-4">
        <header className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("control.documents.awaitingReview")}
          </h3>
          <span className="ml-auto rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            {summary.awaitingReview.length}
          </span>
        </header>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {summary.awaitingReview.map((d) => (
            <li
              key={d.id}
              className="group flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs text-foreground">{d.filename}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                  {d.classification ?? t("control.documents.unclassified")} · {relativeTime(d.createdAt, locale)}
                </p>
              </div>
              <span className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                toneClasses(STATUS_TONE[d.status] ?? "cyan").bg,
                toneClasses(STATUS_TONE[d.status] ?? "cyan").border,
                toneClasses(STATUS_TONE[d.status] ?? "cyan").text,
              )}>
                {d.status}
              </span>
              <button
                type="button"
                onClick={() => setActiveModule("docsmart")}
                className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                aria-label={t("control.attention.open")}
              >
                {t("control.attention.open")}
              </button>
            </li>
          ))}
          {summary.awaitingReview.length === 0 ? (
            <li className="col-span-full rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              {t("control.documents.empty")}
            </li>
          ) : null}
        </ul>
      </section>
    </motion.div>
  );
}
