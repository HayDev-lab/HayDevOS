"use client";

/**
 * Control — ErpFinanceView.
 *
 * Finance drilldown: revenue, AR outstanding, overdue invoices, low stock,
 * margin. Clickable → ERP.
 */

import { motion } from "framer-motion";
import { AlertTriangle,Boxes,Receipt,TrendingUp } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn,formatCurrency,formatDate,toneClasses } from "@/lib/utils";
import type { FinanceSummary } from "../types";
import { KpiCard } from "./KpiCard";

export function ErpFinanceView({ summary }: { summary: FinanceSummary }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  const arAgingMax = Math.max(1, ...summary.arAging.map((b) => b.amount));

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
        {/* AR aging */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.finance.arAging")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.arAging.map((b) => {
              const cls = toneClasses(b.tone);
              const pct = (b.amount / arAgingMax) * 100;
              return (
                <li
                  key={b.bucket}
                  className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
                        <span className="font-medium text-foreground">{t(b.labelKey)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        <span className="font-mono text-foreground">{b.count}</span>
                        {" · "}
                        <span className="font-mono">{formatCurrency(b.amount, "USD")}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", cls.dot)} style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Revenue by customer type */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-lime" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.finance.revenueByType")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.revenueByCustomerType.map((r) => {
              const total = summary.revenueByCustomerType.reduce((s, x) => s + x.amount, 0) || 1;
              const pct = (r.amount / total) * 100;
              return (
                <li
                  key={r.type}
                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium capitalize text-foreground">{r.type}</span>
                      <span className="text-muted-foreground">
                        <span className="font-mono text-foreground">{r.count}</span>
                        {" · "}
                        <span className="font-mono">{formatCurrency(r.amount, "USD")}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-lime" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
            {summary.revenueByCustomerType.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.finance.noRevenue")}
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Overdue invoices */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.finance.overdue")}
            </h3>
            <span className="ml-auto rounded-full border border-rose/30 bg-rose/10 px-2 py-0.5 text-[10px] font-medium text-rose">
              {summary.overdueInvoices.length}
            </span>
          </header>
          <ul className="space-y-2">
            {summary.overdueInvoices.map((inv) => {
              const tone = inv.daysOverdue > 30 ? "rose" : "amber";
              const cls = toneClasses(tone);
              return (
                <li
                  key={inv.id}
                  className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {inv.number}
                      </span>
                      <span className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                        cls.bg, cls.border, cls.text,
                      )}>
                        {inv.daysOverdue}d
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                      {t("control.finance.customer")}: {inv.customerId} · {t("control.finance.due")}: {formatDate(inv.dueAt, locale)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {formatCurrency(inv.amount, inv.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModule("erphub")}
                    className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                    aria-label={t("control.attention.open")}
                  >
                    {t("control.attention.open")}
                  </button>
                </li>
              );
            })}
            {summary.overdueInvoices.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.finance.noOverdue")}
              </li>
            ) : null}
          </ul>
        </section>

        {/* Low stock */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.finance.lowStock")}
            </h3>
            <span className="ml-auto rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber">
              {summary.lowStock.length}
            </span>
          </header>
          <ul className="space-y-2">
            {summary.lowStock.map((p) => (
              <li
                key={p.id}
                className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span>
                    <span className="truncate text-xs font-medium text-foreground">{p.name}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                    {t("control.finance.unit")}: {p.unit} · {t("control.finance.stock")}: {p.stock}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-amber/30 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">
                  {p.stock} left
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModule("erphub")}
                  className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                  aria-label={t("control.attention.open")}
                >
                  {t("control.attention.open")}
                </button>
              </li>
            ))}
            {summary.lowStock.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.finance.noLowStock")}
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </motion.div>
  );
}
