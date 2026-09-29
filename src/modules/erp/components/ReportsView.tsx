"use client";

/**
 * ReportsView — financial reports: P&L, AR aging, sales by product, sales by
 * customer, inventory valuation. Each as table + chart. Date range selector.
 */

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  BarChart3,
  Download,
  TrendingUp,
  AlertTriangle,
  Package,
  Users,
  PieChart as PieChartIcon,
  FileText,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatCompact,
  toneClasses,
} from "@/lib/utils";
import { toast } from "sonner";

import {
  erpInvoices,
  erpProducts,
  erpCustomers,
  erpFinancialSummary,
  customerName,
  invoiceAgingBucket,
  productMarginPct,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ErpSectionHeader } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// P&L
// ─────────────────────────────────────────────────────────────────────────────

function PnLReport() {
  const { t } = useLocale();
  const fin = erpFinancialSummary;
  const grossMarginTone = fin.grossMarginPct >= 60 ? "success" : "warning";
  const netMarginTone = fin.netMarginPct >= 25 ? "success" : "warning";
  const gCls = toneClasses(grossMarginTone);
  const nCls = toneClasses(netMarginTone);

  const rows = [
    { label: t("erp.report.revenue"), value: fin.revenueMtd, tone: "default" as const },
    { label: t("erp.report.cogs"), value: -fin.cogsMtd, tone: "muted" as const },
    { label: t("erp.report.grossProfit"), value: fin.grossProfit, tone: "success" as const, pct: fin.grossMarginPct, pctCls: gCls },
    { label: t("erp.report.opex"), value: -fin.opexMtd, tone: "muted" as const },
    { label: t("erp.report.netProfit"), value: fin.netProfit, tone: "success" as const, pct: fin.netMarginPct, pctCls: nCls },
  ];

  const chartData = rows
    .filter((r) => r.value > 0)
    .map((r) => ({ name: r.label, value: r.value }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.pnl")}</h3>
          </div>
          <div className="p-2">
            <Table>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className={cn(i === rows.length - 1 && "border-t-2 border-t-border")}>
                    <TableCell className={cn("py-2.5", i === rows.length - 1 && "font-semibold")}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{r.label}</span>
                        {r.pct !== undefined && r.pctCls ? (
                          <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px] font-semibold", r.pctCls.border, r.pctCls.bg, r.pctCls.text)}>
                            {r.pct.toFixed(1)}%
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className={cn(
                      "py-2.5 text-right font-medium",
                      r.tone === "success" ? "text-success" : r.value < 0 ? "text-destructive" : "text-foreground",
                    )}>
                      {r.value < 0 ? "−" : ""}{formatCurrency(Math.abs(r.value))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.pnl")}</h3>
          </div>
          <div className="h-[300px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
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
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64} fill="var(--accent-lime)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AR aging
// ─────────────────────────────────────────────────────────────────────────────

function ArAgingReport() {
  const { t, locale } = useLocale();
  const rows = useMemo(() => {
    return erpInvoices
      .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "draft")
      .map((inv) => {
        const aging = invoiceAgingBucket(inv);
        const outstanding = Math.max(0, inv.amount - inv.paidAmount);
        return {
          inv,
          customer: customerName(inv.customerId),
          aging,
          outstanding,
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { "60plus": 0, "31_60": 1, "1_30": 2, current: 3 };
        return (order[a.aging] ?? 4) - (order[b.aging] ?? 4);
      });
  }, []);

  const buckets = useMemo(() => {
    const b = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 };
    for (const r of rows) {
      if (r.aging === "current") b.current += r.outstanding;
      else if (r.aging === "1_30") b.d1_30 += r.outstanding;
      else if (r.aging === "31_60") b.d31_60 += r.outstanding;
      else b.d60plus += r.outstanding;
    }
    return b;
  }, [rows]);

  const chartData = [
    { name: t("erp.aging.current"), value: buckets.current, tone: "success" as const },
    { name: t("erp.aging.1_30"), value: buckets.d1_30, tone: "warning" as const },
    { name: t("erp.aging.31_60"), value: buckets.d31_60, tone: "amber" as const },
    { name: t("erp.aging.60plus"), value: buckets.d60plus, tone: "destructive" as const },
  ];

  const AGING_COLORS: Record<string, string> = {
    success: "var(--success)",
    warning: "var(--warning)",
    amber: "var(--accent-amber)",
    destructive: "var(--destructive)",
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.arAging")}</h3>
          </div>
          <ScrollArea className="max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("erp.invoice.number")}</TableHead>
                  <TableHead>{t("erp.invoice.customer")}</TableHead>
                  <TableHead className="text-right">{t("erp.invoice.outstanding")}</TableHead>
                  <TableHead>{t("erp.invoice.aging")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">—</TableCell></TableRow>
                ) : (
                  rows.map((r) => {
                    const tone =
                      r.aging === "current" ? "success" :
                      r.aging === "1_30" ? "warning" :
                      r.aging === "31_60" ? "warning" :
                      "destructive";
                    const cls = toneClasses(tone);
                    const labelKey =
                      r.aging === "current" ? "erp.aging.current" :
                      r.aging === "1_30" ? "erp.aging.1_30" :
                      r.aging === "31_60" ? "erp.aging.31_60" :
                      "erp.aging.60plus";
                    return (
                      <TableRow key={r.inv.id}>
                        <TableCell className="font-mono text-xs font-medium">{r.inv.number}</TableCell>
                        <TableCell className="text-sm">{r.customer}</TableCell>
                        <TableCell className={cn("text-right text-sm font-medium", cls.text)}>
                          {formatCurrency(r.outstanding, r.inv.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px] uppercase tracking-wider", cls.border, cls.bg, cls.text)}>
                            {t(labelKey)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.arAging")}</h3>
          </div>
          <div className="h-[300px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v as number)} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 }}
                  formatter={(value: number) => [formatCurrency(value), t("erp.invoice.outstanding")]}
                  cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={AGING_COLORS[entry.tone]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales by product
// ─────────────────────────────────────────────────────────────────────────────

function SalesByProductReport() {
  const { t } = useLocale();

  const rows = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const inv of erpInvoices) {
      for (const li of inv.lineItems) {
        const cur = map.get(li.description) ?? { name: li.description, qty: 0, revenue: 0 };
        cur.qty += li.qty;
        cur.revenue += li.total;
        map.set(li.description, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, []);

  const chartData = rows.slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.salesByProduct")}</h3>
          </div>
          <ScrollArea className="max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("erp.product.name")}</TableHead>
                  <TableHead className="text-right">{t("erp.report.qty")}</TableHead>
                  <TableHead className="text-right">{t("erp.report.revenue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{r.name}</TableCell>
                    <TableCell className="text-right text-sm">{r.qty}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(r.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.salesByProduct")}</h3>
          </div>
          <div className="h-[300px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v as number)} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={170} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 }}
                  formatter={(value: number) => [formatCurrency(value), t("erp.report.revenue")]}
                  cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22} fill="var(--accent-cyan)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales by customer
// ─────────────────────────────────────────────────────────────────────────────

function SalesByCustomerReport() {
  const { t } = useLocale();

  const rows = useMemo(() => {
    return [...erpCustomers]
      .map((c) => ({
        customer: c,
        revenue: c.totalSpent,
        orders: c.orderCount,
        outstanding: c.outstandingBalance,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 12);
  }, []);

  const chartData = rows.slice(0, 8).map((r) => ({ name: r.customer.name, revenue: r.revenue }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.salesByCustomer")}</h3>
          </div>
          <ScrollArea className="max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("erp.customer.name")}</TableHead>
                  <TableHead className="text-right">{t("erp.customer.orders")}</TableHead>
                  <TableHead className="text-right">{t("erp.customer.revenue")}</TableHead>
                  <TableHead className="text-right">{t("erp.customer.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.customer.id}>
                    <TableCell className="text-sm font-medium">{r.customer.name}</TableCell>
                    <TableCell className="text-right text-sm">{r.orders}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(r.revenue)}</TableCell>
                    <TableCell className={cn("text-right text-sm", r.outstanding > 0 ? "font-medium text-amber" : "text-muted-foreground")}>
                      {formatCurrency(r.outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.salesByCustomer")}</h3>
          </div>
          <div className="h-[300px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v as number)} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={140} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 }}
                  formatter={(value: number) => [formatCurrency(value), t("erp.report.revenue")]}
                  cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22} fill="var(--accent-lime)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory valuation
// ─────────────────────────────────────────────────────────────────────────────

function InventoryValuationReport() {
  const { t } = useLocale();

  const rows = useMemo(() => {
    return erpProducts
      .filter((p) => p.reorderPoint > 0 || p.stock < 1000)
      .map((p) => ({
        product: p,
        qty: p.stock,
        unitCost: p.cost,
        valuation: p.stock * p.cost,
        margin: productMarginPct(p),
      }))
      .sort((a, b) => b.valuation - a.valuation);
  }, []);

  const totalValuation = rows.reduce((s, r) => s + r.valuation, 0);

  const chartData = rows.slice(0, 8).map((r) => ({ name: r.product.sku, value: r.valuation }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.inventoryVal")}</h3>
            <span className="text-xs text-muted-foreground">{formatCurrency(totalValuation)}</span>
          </div>
          <ScrollArea className="max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("erp.product.sku")}</TableHead>
                  <TableHead className="text-right">{t("erp.report.qty")}</TableHead>
                  <TableHead className="text-right">{t("erp.product.cost")}</TableHead>
                  <TableHead className="text-right">{t("erp.report.valuation")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.product.id}>
                    <TableCell className="font-mono text-xs">{r.product.sku}</TableCell>
                    <TableCell className="text-right text-sm">{r.qty}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.unitCost)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(r.valuation)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-t-border">
                  <TableCell colSpan={3} className="font-semibold">{t("erp.invoice.total")}</TableCell>
                  <TableCell className="text-right font-semibold text-foreground">{formatCurrency(totalValuation)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t("erp.report.inventoryVal")}</h3>
          </div>
          <div className="h-[300px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v as number)} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 }}
                  formatter={(value: number) => [formatCurrency(value), t("erp.report.valuation")]}
                  cursor={{ fill: "color-mix(in oklab, var(--muted-foreground) 8%, transparent)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48} fill="var(--accent-amber)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReportsView
// ─────────────────────────────────────────────────────────────────────────────

export function ReportsView() {
  const { t } = useLocale();
  const [range, setRange] = useState<string>("90");

  return (
    <div className="space-y-4">
      <ErpSectionHeader
        icon={BarChart3}
        title={t("erp.report.title")}
        right={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder={t("erp.report.range")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{t("erp.report.range.30")}</SelectItem>
                <SelectItem value="90">{t("erp.report.range.90")}</SelectItem>
                <SelectItem value="ytd">{t("erp.report.range.ytd")}</SelectItem>
                <SelectItem value="all">{t("erp.report.range.all")}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => toast.success(t("erp.toast.exportQueued"))}>
              <Download className="h-4 w-4" />
              {t("erp.report.export")}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="pnl">
        <TabsList className="flex w-full flex-wrap gap-1 overflow-x-auto">
          <TabsTrigger value="pnl"><TrendingUp className="h-3.5 w-3.5" />{t("erp.report.pnl")}</TabsTrigger>
          <TabsTrigger value="ar"><AlertTriangle className="h-3.5 w-3.5" />{t("erp.report.arAging")}</TabsTrigger>
          <TabsTrigger value="prod"><Package className="h-3.5 w-3.5" />{t("erp.report.salesByProduct")}</TabsTrigger>
          <TabsTrigger value="cust"><Users className="h-3.5 w-3.5" />{t("erp.report.salesByCustomer")}</TabsTrigger>
          <TabsTrigger value="inv"><FileText className="h-3.5 w-3.5" />{t("erp.report.inventoryVal")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="mt-4"><PnLReport /></TabsContent>
        <TabsContent value="ar" className="mt-4"><ArAgingReport /></TabsContent>
        <TabsContent value="prod" className="mt-4"><SalesByProductReport /></TabsContent>
        <TabsContent value="cust" className="mt-4"><SalesByCustomerReport /></TabsContent>
        <TabsContent value="inv" className="mt-4"><InventoryValuationReport /></TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportsView;
