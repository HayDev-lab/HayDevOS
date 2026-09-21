"use client";

/**
 * ErpDashboard — operations & finance overview.
 *
 * KPI row + invoice aging chart + revenue vs expense area chart +
 * top products bar + low-stock alert list + recent orders +
 * integration health cards.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PackageX,
  Boxes,
  Receipt,
  CreditCard,
  Wallet,
  Percent,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Plug,
  ArrowRight,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  formatCompact,
  toneClasses,
  statusColor,
} from "@/lib/utils";
import {
  erpFinancialSummary,
  erpInvoices,
  erpOrders,
  erpProducts,
  erpIntegrationHealth,
  customerName,
  invoiceAgingBucket,
  invoiceOutstanding,
  lowStockProducts,
  type ErpProduct,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AiProtectedBadge, StatusBadge, ErpSectionHeader } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  deltaPct,
  tone,
  icon: Icon,
  footnote,
}: {
  label: string;
  value: string;
  deltaPct?: number;
  tone: "lime" | "cyan" | "amber" | "rose" | "violet";
  icon: React.ComponentType<{ className?: string }>;
  footnote?: string;
}) {
  const toneCls = toneClasses(tone);
  const showDelta = typeof deltaPct === "number";
  const positive = (deltaPct ?? 0) >= 0;
  return (
    <Card className="surface-elevated gap-0 overflow-hidden py-0">
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            toneCls.border,
            toneCls.bg,
            toneCls.text,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-2">
        {showDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              positive ? "text-success" : "text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {positive ? "+" : ""}
            {deltaPct!.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {footnote ?? ""}
          </span>
        )}
        <span className={cn("h-1.5 w-1.5 rounded-full", toneCls.dot)} aria-hidden />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration health card
// ─────────────────────────────────────────────────────────────────────────────

function IntegrationCard({
  nameKey,
  descKey,
  status,
  lastSync,
  events,
}: {
  nameKey: string;
  descKey: string;
  status: "synced" | "degraded" | "error";
  lastSync: string;
  events: number;
}) {
  const { t, locale } = useLocale();
  const tone =
    status === "synced" ? "success" : status === "degraded" ? "warning" : "destructive";
  const cls = toneClasses(tone);
  const statusLabelKey =
    status === "synced"
      ? "erp.integrations.synced"
      : status === "degraded"
        ? "erp.integrations.degraded"
        : "erp.integrations.error";
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Plug className="h-3.5 w-3.5" />
          {t(nameKey)}
        </span>
        <Badge
          variant="outline"
          className={cn("gap-1 px-1.5 py-0 text-[10px] font-semibold", cls.border, cls.bg, cls.text)}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} aria-hidden />
          {t(statusLabelKey)}
        </Badge>
      </div>
      <p className="text-sm text-foreground">{t(descKey)}</p>
      <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground/70">
        <span>{formatDate(lastSync, locale)}</span>
        <span>{formatCompact(events)} evts</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function ErpDashboard() {
  const { t, locale } = useLocale();
  const fin = erpFinancialSummary;

  // Aging chart data
  const agingData = useMemo(
    () => [
      { name: t("erp.aging.current"), value: fin.agingBuckets.current, tone: "success" as const },
      { name: t("erp.aging.1_30"), value: fin.agingBuckets.d1_30, tone: "warning" as const },
      { name: t("erp.aging.31_60"), value: fin.agingBuckets.d31_60, tone: "amber" as const },
      { name: t("erp.aging.60plus"), value: fin.agingBuckets.d60plus, tone: "destructive" as const },
    ],
    [fin, t],
  );

  // Monthly revenue vs expense
  const monthlyData = useMemo(
    () =>
      fin.monthly.map((m) => ({
        name: t(`erp.month.${m.month}`),
        revenue: m.revenue,
        expense: m.expense,
      })),
    [fin, t],
  );

  // Top products by revenue (from invoices lineItems aggregation)
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number }>();
    for (const inv of erpInvoices) {
      for (const li of inv.lineItems) {
        const cur = map.get(li.description) ?? { name: li.description, revenue: 0 };
        cur.revenue += li.total;
        map.set(li.description, cur);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, []);

  // Recent orders (5 most recent)
  const recentOrders = useMemo(
    () => [...erpOrders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6),
    [],
  );

  // Low stock products
  const lowStock = useMemo(() => lowStockProducts(), []);

  // Pie colors for aging
  const AGING_COLORS: Record<string, string> = {
    success: "var(--success)",
    warning: "var(--warning)",
    amber: "var(--accent-amber)",
    destructive: "var(--destructive)",
  };

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <ErpSectionHeader
            icon={Activity}
            title={t("erp.kpi.revenueMtd")}
            subtitle={t("erp.subtitle")}
          />
          <AiProtectedBadge withTooltip />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label={t("erp.kpi.revenueMtd")}
            value={formatCurrency(fin.revenueMtd)}
            deltaPct={fin.revenueMtdDeltaPct}
            tone="lime"
            icon={TrendingUp}
          />
          <KpiCard
            label={t("erp.kpi.ordersOpen")}
            value={String(fin.openOrders)}
            tone="cyan"
            icon={Boxes}
            footnote={`${t("erp.order.title")}`}
          />
          <KpiCard
            label={t("erp.kpi.arOutstanding")}
            value={formatCurrency(fin.arOutstanding)}
            tone="amber"
            icon={Receipt}
            footnote="A/R"
          />
          <KpiCard
            label={t("erp.kpi.apOutstanding")}
            value={formatCurrency(fin.apOutstanding)}
            tone="rose"
            icon={CreditCard}
            footnote="A/P"
          />
          <KpiCard
            label={t("erp.kpi.lowStock")}
            value={String(fin.lowStockCount)}
            tone="amber"
            icon={PackageX}
            footnote={`${t("erp.product.title")}`}
          />
          <KpiCard
            label={t("erp.kpi.netMargin")}
            value={`${fin.netMarginPct.toFixed(1)}%`}
            tone="violet"
            icon={Percent}
            footnote={formatCurrency(fin.netProfit)}
          />
        </div>
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Aging chart */}
        <Card className="surface-elevated">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("erp.dashboard.agingChart")}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(fin.arOutstanding)} · A/R
              </span>
            </div>
            <div className="h-[260px] w-full p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCompact(v as number)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Amount"]}
                    cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {agingData.map((entry, idx) => (
                      <Cell key={idx} fill={AGING_COLORS[entry.tone]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue vs expense area chart */}
        <Card className="surface-elevated">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-lime" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("erp.dashboard.revVsExp")}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {t("erp.report.netProfit")}: {formatCurrency(fin.netProfit)}
              </span>
            </div>
            <div className="h-[260px] w-full p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-lime)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent-lime)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-rose)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--accent-rose)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCompact(v as number)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "revenue" ? t("erp.report.revenue") : t("erp.report.opex"),
                    ]}
                    cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--accent-lime)"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="var(--accent-rose)"
                    strokeWidth={2}
                    fill="url(#expGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Top products + Low-stock alerts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Top products */}
        <Card className="surface-elevated lg:col-span-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("erp.dashboard.topProducts")}
                </h2>
              </div>
            </div>
            <div className="h-[280px] w-full p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCompact(v as number)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={180}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatCurrency(value), t("erp.report.revenue")]}
                    cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={28} fill="var(--accent-cyan)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low-stock alerts */}
        <Card className="surface-elevated lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <PackageX className="h-4 w-4 text-amber" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("erp.dashboard.lowStockAlerts")}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">{lowStock.length} {t("erp.kpi.lowStock").toLowerCase()}</span>
            </div>
            <ScrollArea className="max-h-[280px]">
              <ul className="divide-y divide-border">
                {lowStock.length === 0 ? (
                  <li className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {t("erp.common.noData")}
                  </li>
                ) : (
                  lowStock.map((p: ErpProduct) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber/30 bg-amber/10 text-amber">
                        <PackageX className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.sku} · {p.warehouseLocation}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber">{p.stock}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          / {p.reorderPoint}
                        </p>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      {/* Recent orders + integration health */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent orders */}
        <Card className="surface-elevated lg:col-span-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-cyan" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("erp.dashboard.recentOrders")}
                </h2>
              </div>
            </div>
            <ScrollArea className="max-h-[320px]">
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => {
                  const total = o.items.reduce((sum, li) => sum + li.total, 0);
                  return (
                    <li key={o.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                        <Boxes className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {o.number}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {customerName(o.customerId)}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(o.createdAt, locale)} · {o.items.length} {t("erp.order.items").toLowerCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(total, o.currency)}</p>
                        <StatusBadge status={o.status} label={t(`erp.order.status.${o.status}` as const)} className="mt-1" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Integration health */}
        <Card className="surface-elevated lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-violet" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("erp.dashboard.integrations")}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4">
              {erpIntegrationHealth.map((h) => (
                <IntegrationCard
                  key={h.id}
                  nameKey={h.nameKey}
                  descKey={h.descKey}
                  status={h.status}
                  lastSync={h.lastSync}
                  events={h.events}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default ErpDashboard;
