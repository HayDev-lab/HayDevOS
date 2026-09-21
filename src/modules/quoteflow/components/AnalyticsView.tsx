"use client";

/**
 * AnalyticsView — charts powered by recharts.
 *
 * - KPI cards: total quotes, accepted, conversion, pipeline value, avg discount, win rate
 * - Quotes sent vs accepted (monthly bar chart)
 * - Quote value over time (area chart)
 * - Win rate by owner (horizontal bar)
 * - Discount trend (line)
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  CheckCircle2,
  Percent,
  DollarSign,
  Activity,
  Trophy,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency, formatCompact } from "@/lib/utils";

import { mockQuotes, mockLeads, mockCustomers, resolveQuoteOwner } from "../data";

import { Card, CardContent } from "@/components/ui/card";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function AnalyticsView() {
  const { t } = useLocale();

  const kpis = useMemo(() => {
    const total = mockQuotes.length;
    const accepted = mockQuotes.filter((q) => q.status === "accepted").length;
    const sent = mockQuotes.filter((q) => q.status === "sent" || q.status === "accepted" || q.status === "rejected").length;
    const pipelineValue = mockQuotes
      .filter((q) => q.status === "sent" || q.status === "draft")
      .reduce((s, q) => s + q.total, 0);
    const acceptedValue = mockQuotes
      .filter((q) => q.status === "accepted")
      .reduce((s, q) => s + q.total, 0);
    const avgDiscount =
      mockQuotes.reduce((s, q) => s + (q.discount / (q.subtotal || 1)) * 100, 0) / mockQuotes.length;
    const conversionRate = sent > 0 ? (accepted / sent) * 100 : 0;
    const winRate = total > 0 ? (accepted / total) * 100 : 0;
    const avgDeal = accepted > 0 ? acceptedValue / accepted : 0;
    return {
      total,
      accepted,
      conversionRate,
      pipelineValue,
      avgDiscount,
      winRate,
      avgDeal,
    };
  }, []);

  // Monthly sent vs accepted
  const sentVsAccepted = useMemo(() => {
    const buckets: Record<string, { sent: number; accepted: number; value: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${MONTHS[d.getMonth()]}`;
      buckets[key] = { sent: 0, accepted: 0, value: 0 };
    }
    const keys = Object.keys(buckets);
    for (const q of mockQuotes) {
      const d = new Date(q.createdAt);
      const key = `${MONTHS[d.getMonth()]}`;
      if (!buckets[key]) continue;
      buckets[key].value += q.total;
      if (q.status === "sent" || q.status === "accepted" || q.status === "rejected" || q.status === "expired") {
        buckets[key].sent += 1;
      }
      if (q.status === "accepted") buckets[key].accepted += 1;
    }
    return keys.map((k) => ({ month: k, ...buckets[k] }));
  }, []);

  // Win rate by owner
  const winByOwner = useMemo(() => {
    const map: Record<string, { total: number; accepted: number }> = {};
    for (const q of mockQuotes) {
      const owner = resolveQuoteOwner(q);
      map[owner] = map[owner] ?? { total: 0, accepted: 0 };
      map[owner].total += 1;
      if (q.status === "accepted") map[owner].accepted += 1;
    }
    return Object.entries(map).map(([name, v]) => ({
      name,
      rate: v.total > 0 ? Math.round((v.accepted / v.total) * 100) : 0,
      total: v.total,
    }));
  }, []);

  // Discount trend per quote (by createdAt)
  const discountTrend = useMemo(() => {
    return mockQuotes
      .map((q) => ({
        number: q.number,
        discount: Math.round((q.discount / (q.subtotal || 1)) * 1000) / 10,
        createdAt: q.createdAt,
      }))
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Activity className="h-4 w-4 text-cyan" />
          {t("quoteflow.analytics.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("quoteflow.analytics.subtitle")}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={TrendingUp} label={t("quoteflow.analytics.kpi.totalQuotes")} value={String(kpis.total)} tone="cyan" />
        <KpiCard icon={CheckCircle2} label={t("quoteflow.analytics.kpi.accepted")} value={String(kpis.accepted)} tone="lime" />
        <KpiCard icon={Percent} label={t("quoteflow.analytics.kpi.conversionRate")} value={`${kpis.conversionRate.toFixed(0)}%`} tone="amber" />
        <KpiCard icon={DollarSign} label={t("quoteflow.analytics.kpi.pipelineValue")} value={formatCompact(kpis.pipelineValue)} tone="cyan" />
        <KpiCard icon={Activity} label={t("quoteflow.analytics.kpi.avgDiscount")} value={`${kpis.avgDiscount.toFixed(1)}%`} tone="amber" />
        <KpiCard icon={Trophy} label={t("quoteflow.analytics.kpi.winRate")} value={`${kpis.winRate.toFixed(0)}%`} tone="lime" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t("quoteflow.analytics.conversion")}
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentVsAccepted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar dataKey="sent" name={t("quoteflow.analytics.sent")} fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="accepted" name={t("quoteflow.analytics.accepted")} fill="var(--accent-lime)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t("quoteflow.analytics.valueOverTime")}
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sentVsAccepted} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatCurrency(v, "USD")}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent-cyan)"
                    strokeWidth={2}
                    fill="url(#valueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t("quoteflow.analytics.winRateByOwner")}
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winByOwner} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `${v}%`}
                  />
                  <Bar dataKey="rate" name={t("quoteflow.analytics.kpi.winRate")} radius={[0, 4, 4, 0]}>
                    {winByOwner.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.rate >= 50 ? "var(--accent-lime)" : entry.rate >= 25 ? "var(--accent-amber)" : "var(--accent-rose)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {t("quoteflow.analytics.discountTrend")}
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={discountTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `${v}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey="discount"
                    stroke="var(--accent-amber)"
                    strokeWidth={2}
                    dot={{ fill: "var(--accent-amber)", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average deal size card */}
      <Card className="surface-elevated">
        <CardContent className="p-4">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t("quoteflow.analytics.avgDeal")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {kpis.accepted} / {kpis.total} {t("quoteflow.analytics.accepted").toLowerCase()}
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-lime">
                {formatCurrency(kpis.avgDeal, "USD")}
              </div>
              <div className="text-xs text-muted-foreground">avg / accepted quote</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  tone: "lime" | "cyan" | "amber" | "rose";
}) {
  const toneText =
    tone === "lime" ? "text-lime" : tone === "cyan" ? "text-cyan" : tone === "amber" ? "text-amber" : "text-rose";
  const toneBg =
    tone === "lime" ? "bg-lime/10" : tone === "cyan" ? "bg-cyan/10" : tone === "amber" ? "bg-amber/10" : "bg-rose/10";
  return (
    <Card className="surface-elevated">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={cn("grid h-8 w-8 place-items-center rounded-md", toneBg)}>
            <Icon className={cn("h-4 w-4", toneText)} />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div className={cn("mt-2 font-mono text-xl font-bold", toneText)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
