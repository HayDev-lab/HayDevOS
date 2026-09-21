"use client";

/**
 * AnalyticsView — pipeline performance charts via recharts.
 *
 * Cards: total processed, avg processing time, error rate, avg confidence.
 * Charts:
 *   1. Documents processed (14 days) — stacked AreaChart by classification
 *   2. Documents by type — horizontal BarChart with confidence labels
 *   3. Confidence distribution — BarChart (rose / amber / lime buckets)
 *   4. Review throughput — AreaChart (14 days)
 */

import * as React from "react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  FileStack,
  Timer,
  AlertTriangle,
  Gauge,
  TrendingUp,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

import {
  docflowProcessedOverTime,
  docflowByType,
  docflowConfidenceDist,
  docflowReviewThroughput,
  docflowKpis,
} from "../data";

const TONE_HEX: Record<"rose" | "amber" | "lime", string> = {
  rose: "#f43f5e",
  amber: "#f59e0b",
  lime: "#a3e635",
};

const TYPE_HEX: Record<string, string> = {
  pdf: "#a3e635",
  docx: "#22d3ee",
  xlsx: "#22c55e",
  csv: "#22c55e",
  txt: "#8b95a5",
  png: "#c084fc",
  jpg: "#f59e0b",
};

export function AnalyticsView() {
  const { t } = useLocale();

  const processedData = useMemo(
    () =>
      docflowProcessedOverTime.map((p) => ({
        date: p.date.slice(5),
        invoice: p.invoice,
        contract: p.contract,
        receipt: p.receipt,
        id: p.id,
        form: p.form,
        other: p.other,
        total: p.count,
      })),
    [],
  );

  const typeData = useMemo(
    () => docflowByType.map((d) => ({ ...d, fill: TYPE_HEX[d.type] })),
    [],
  );

  const confData = useMemo(
    () =>
      docflowConfidenceDist.map((d) => ({
        ...d,
        fill: TONE_HEX[d.tone],
      })),
    [],
  );

  const reviewData = useMemo(
    () => docflowReviewThroughput.map((d) => ({ date: d.date.slice(5), reviewed: d.reviewed })),
    [],
  );

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--foreground)",
  };

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<FileStack size={16} />}
          label={t("docflow.analytics.total")}
          value={String(docflowKpis.total)}
          tone="lime"
        />
        <KpiCard
          icon={<Timer size={16} />}
          label={t("docflow.analytics.avgTime")}
          value={`${docflowKpis.avgTimeSec}s`}
          tone="cyan"
        />
        <KpiCard
          icon={<AlertTriangle size={16} />}
          label={t("docflow.analytics.errorRate")}
          value={`${docflowKpis.errorRatePct}%`}
          tone="rose"
        />
        <KpiCard
          icon={<Gauge size={16} />}
          label={t("docflow.analytics.avg")}
          value={`${Math.round(docflowKpis.avgConfidence * 100)}%`}
          tone="amber"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Processed over time — stacked area */}
        <Card className="surface-elevated xl:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp size={14} className="text-lime" />
                {t("docflow.analytics.processedOverTime")}
              </h3>
              <Legend
                items={[
                  { label: "invoice", color: TYPE_HEX.invoice ?? "#22d3ee" },
                  { label: "contract", color: "#c084fc" },
                  { label: "receipt", color: "#f59e0b" },
                  { label: "id", color: "#a3e635" },
                  { label: "form", color: "#22d3ee" },
                  { label: "other", color: "#8b95a5" },
                ]}
              />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gInvoice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gContract" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c084fc" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#c084fc" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gReceipt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border)" }} />
                  <Area type="monotone" dataKey="invoice" stackId="1" stroke="#22d3ee" strokeWidth={1.5} fill="url(#gInvoice)" />
                  <Area type="monotone" dataKey="contract" stackId="1" stroke="#c084fc" strokeWidth={1.5} fill="url(#gContract)" />
                  <Area type="monotone" dataKey="receipt" stackId="1" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gReceipt)" />
                  <Area type="monotone" dataKey="id" stackId="1" stroke="#a3e635" strokeWidth={1.5} fill="#a3e635" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="form" stackId="1" stroke="#22d3ee" strokeWidth={1.5} fill="#22d3ee" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="other" stackId="1" stroke="#8b95a5" strokeWidth={1.5} fill="#8b95a5" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By type — bar */}
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-medium">{t("docflow.analytics.byType")}</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", fillOpacity: 0.2 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {typeData.map((d) => (
                      <Cell key={d.type} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Confidence distribution — bar */}
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-medium">{t("docflow.analytics.confidenceDist")}</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="bucket" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", fillOpacity: 0.2 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {confData.map((d) => (
                      <Cell key={d.bucket} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Review throughput — area */}
        <Card className="surface-elevated xl:col-span-2">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center justify-between text-sm font-medium">
              <span>{t("docflow.analytics.reviewThroughput")}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {t("docflow.review.reviewedToday")}:{" "}
                <span className="font-mono text-lime">{docflowKpis.reviewedToday}</span>
              </span>
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reviewData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gReview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a3e635" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#a3e635" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border)" }} />
                  <Area type="monotone" dataKey="reviewed" stroke="#a3e635" strokeWidth={1.5} fill="url(#gReview)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "lime" | "cyan" | "amber" | "rose" | "violet";
}) {
  const cls: Record<typeof tone, string> = {
    lime: "text-lime bg-lime/10 border-lime/30",
    cyan: "text-cyan bg-cyan/10 border-cyan/30",
    amber: "text-amber bg-amber/10 border-amber/30",
    rose: "text-rose bg-rose/10 border-rose/30",
    violet: "text-violet bg-violet/10 border-violet/30",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="surface-elevated">
        <CardContent className="flex items-center gap-3 p-4">
          <span className={cn("flex size-9 items-center justify-center rounded-lg border", cls[tone])}>
            {icon}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-mono text-xl font-semibold tabular-nums">{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="size-2 rounded-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
