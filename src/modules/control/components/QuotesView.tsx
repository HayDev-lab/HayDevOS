"use client";

/**
 * Control — QuotesView.
 *
 * Quote drilldown: sent value, acceptance rate, expiring soon, pending
 * approvals, quote funnel. Clickable → QuoteFlow.
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
import { Clock, FileText, AlertTriangle } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, formatCurrency, formatDate, toneClasses } from "@/lib/utils";
import type { QuoteSummary } from "../types";
import { KpiCard } from "./KpiCard";

const FUNNEL_TONE: Record<string, "lime" | "cyan" | "amber" | "rose" | "violet"> = {
  draft: "cyan",
  sent: "amber",
  accepted: "lime",
  rejected: "rose",
  expired: "rose",
};

export function QuotesView({ summary }: { summary: QuoteSummary }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const funnelData = useMemo(
    () => summary.funnel.map((f) => ({ ...f, valueK: f.value / 1000 })),
    [summary.funnel],
  );

  const maxCount = Math.max(1, ...summary.funnel.map((f) => f.count));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summary.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Quote funnel */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.quotes.funnel")}
            </h3>
          </header>
          <div className="space-y-2">
            {summary.funnel.map((f) => {
              const tone = FUNNEL_TONE[f.stage] ?? "cyan";
              const cls = toneClasses(tone);
              const pct = (f.count / maxCount) * 100;
              return (
                <button
                  key={f.stage}
                  type="button"
                  onClick={() => setActiveModule("quoteflow")}
                  className="group block w-full text-left"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
                      <span className="font-medium text-foreground">{t(f.labelKey)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      <span className="font-mono text-foreground">{f.count}</span>
                      {" · "}
                      <span className="font-mono">{formatCurrency(f.value, "USD")}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", cls.dot)}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 3" vertical={false} />
                <XAxis dataKey="stage" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => formatCurrency(v * 1000)}
                />
                <Bar dataKey="valueK" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {funnelData.map((f, i) => (
                    <Cell key={i} fill={`var(--accent-${FUNNEL_TONE[f.stage] ?? "cyan"})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Expiring soon + pending approvals */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.quotes.expiringSoon")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.expiringSoon.map((q) => {
              const urgent = q.daysLeft <= 2;
              return (
                <li
                  key={q.id}
                  className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {q.number}
                      </span>
                      {urgent ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-rose/30 bg-rose/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {q.daysLeft}d
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber/30 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">
                          {q.daysLeft}d
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                      {t("control.quotes.validUntil")}: {formatDate(q.validUntil, locale)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {formatCurrency(q.total, q.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModule("quoteflow")}
                    className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                    aria-label={t("control.attention.open")}
                  >
                    {t("control.attention.open")}
                  </button>
                </li>
              );
            })}
            {summary.expiringSoon.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.quotes.noExpiring")}
              </li>
            ) : null}
          </ul>

          {summary.pendingApprovals.length > 0 ? (
            <>
              <header className="mb-2 mt-4 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-violet" />
                <h4 className="text-xs font-semibold text-foreground">
                  {t("control.quotes.pendingApprovals")}
                </h4>
              </header>
              <ul className="space-y-1.5">
                {summary.pendingApprovals.map((q) => (
                  <li key={q.id} className="flex items-center gap-2 rounded-md border border-border/40 bg-card/40 px-2.5 py-1.5">
                    <span className="font-mono text-[11px] text-foreground">{q.number}</span>
                    <span className="ml-auto text-xs text-foreground">{formatCurrency(q.total, q.currency)}</span>
                    <button
                      type="button"
                      onClick={() => setActiveModule("quoteflow")}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      {t("control.attention.open")}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </motion.div>
  );
}
