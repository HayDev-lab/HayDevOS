"use client";

/**
 * AnalyticsView — recharts dashboard for the Integration Hub.
 *
 * KPI row: total integrations, sync success rate, events 24h, avg sync
 * duration, expiring credentials.
 *
 * Charts:
 *  - Integrations by status (donut, color-coded per status accent).
 *  - Sync success/failed/partial over time (stacked area).
 *  - Events per provider (horizontal bar, color per provider accent).
 *  - Avg sync duration by provider (vertical bar).
 *  - Credential health buckets (donut).
 */

import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Plug,
  CheckCircle2,
  Activity,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type {
  Integration,
  Credential,
} from "../types";
import {
  statusBreakdown,
  syncSuccessSeries,
  eventsByProvider,
  avgDurationByProvider,
  credentialHealthBuckets,
} from "../data";
import { localizeDisplayText } from "../localization";

import { Card, CardContent } from "@/components/ui/card";

interface Props {
  integrations: Integration[];
  credentials: Credential[];
}

const COLORS = {
  lime: "var(--accent-lime)",
  cyan: "var(--accent-cyan)",
  amber: "var(--accent-amber)",
  rose: "var(--accent-rose)",
  violet: "var(--accent-violet)",
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--info)",
  destructive: "var(--destructive)",
};

const STATUS_COLOR: Record<string, string> = {
  connected: COLORS.lime,
  degraded: COLORS.amber,
  reauth_required: COLORS.amber,
  error: COLORS.rose,
  disconnected: COLORS.violet,
};

export function AnalyticsView({ integrations, credentials }: Props) {
  const { t, locale } = useLocale();

  const localizedStatusBreakdown = statusBreakdown.map((entry) => ({
    ...entry,
    label: t(`integration.status.${entry.status}`),
  }));
  const localizedSyncSeries = syncSuccessSeries.map((entry) => ({
    ...entry,
    day: t(`integration.analytics.weekday.${entry.day}`),
  }));
  const localizedEventsByProvider = eventsByProvider.map((entry) => ({
    ...entry,
    provider: localizeDisplayText(entry.provider, locale),
  }));
  const localizedCredentialHealth = credentialHealthBuckets.map((entry) => ({
    ...entry,
    label:
      entry.bucket === "Healthy"
        ? t("integration.vault.healthy")
        : entry.bucket === "Expiring ≤14d"
          ? t("integration.vault.expiring")
          : entry.bucket === "Expired"
            ? t("integration.vault.expired")
            : t("integration.analytics.noExpiry"),
  }));

  const kpis = useMemo(() => {
    const total = integrations.length;
    const connected = integrations.filter((i) => i.status === "connected").length;
    const events24h = eventsByProvider.reduce((sum, item) => sum + item.events, 0);
    const avgDurationMs = avgDurationByProvider.length > 0
      ? Math.round(avgDurationByProvider.reduce((sum, item) => sum + item.ms, 0) / avgDurationByProvider.length)
      : null;
    const expiring = credentials.filter((c) => {
      if (!c.expiresAt) return false;
      const days = (new Date(c.expiresAt).getTime() - Date.now()) / 86400000;
      return days <= 14;
    }).length;
    return { total, connected, events24h, expiring, avgDurationMs };
  }, [integrations, credentials]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("integration.analytics.title")}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground/80">
          {t("integration.analytics.sub")}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Kpi
          label={t("integration.analytics.kpi.total")}
          value={String(kpis.total)}
          icon={<Plug className="h-3.5 w-3.5" />}
          tone="cyan"
        />
        <Kpi
          label={t("integration.analytics.kpi.connected")}
          value={String(kpis.connected)}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          tone="lime"
        />
        <Kpi
          label={t("integration.analytics.kpi.events24h")}
          value={kpis.events24h.toLocaleString()}
          icon={<Activity className="h-3.5 w-3.5" />}
          tone="violet"
        />
        <Kpi
          label={t("integration.analytics.kpi.avgDuration")}
          value={kpis.avgDurationMs === null ? "—" : `${kpis.avgDurationMs}ms`}
          icon={<Clock className="h-3.5 w-3.5" />}
          tone="amber"
        />
        <Kpi
          label={t("integration.analytics.kpi.expiring")}
          value={String(kpis.expiring)}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          tone="rose"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Integrations by status — donut */}
        <Card className="surface-elevated py-0">
          <CardContent className="p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("integration.analytics.byStatus")}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={localizedStatusBreakdown.filter((d) => d.count > 0)}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {localizedStatusBreakdown
                    .filter((d) => d.count > 0)
                    .map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLOR[entry.status] ?? COLORS.violet}
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Legend
                  iconType="circle"
                  formatter={(v) => (
                    <span className="text-[10px] text-muted-foreground">{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sync success over time — stacked area */}
        <Card className="surface-elevated py-0">
          <CardContent className="p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("integration.analytics.syncSuccess")}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={localizedSyncSeries} margin={{ left: -16, right: 4, top: 4 }}>
                <defs>
                  <linearGradient id="syncSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.lime} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={COLORS.lime} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="syncFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.rose} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={COLORS.rose} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="syncPartial" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.amber} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={COLORS.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} />
                <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} stroke="var(--border)" />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="success"
                  name={t("integration.sync.status.success")}
                  stackId="1"
                  stroke={COLORS.lime}
                  fill="url(#syncSuccess)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="partial"
                  name={t("integration.sync.status.partial")}
                  stackId="1"
                  stroke={COLORS.amber}
                  fill="url(#syncPartial)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  name={t("integration.sync.status.failed")}
                  stackId="1"
                  stroke={COLORS.rose}
                  fill="url(#syncFailed)"
                  strokeWidth={2}
                />
                <Legend
                  iconType="circle"
                  formatter={(v) => (
                    <span className="text-[10px] text-muted-foreground">{v}</span>
                  )}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Events per provider — horizontal bar */}
        <Card className="surface-elevated py-0">
          <CardContent className="p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("integration.analytics.eventsByProvider")}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={localizedEventsByProvider}
                layout="vertical"
                margin={{ left: 30, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} stroke="var(--border)" />
                <YAxis
                  type="category"
                  dataKey="provider"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  stroke="var(--border)"
                  width={92}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="events" radius={[0, 4, 4, 0]}>
                  {localizedEventsByProvider.map((entry, idx) => {
                    const palette = [COLORS.violet, COLORS.lime, COLORS.cyan, COLORS.amber, COLORS.rose, COLORS.info];
                    return <Cell key={entry.provider} fill={palette[idx % palette.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Avg sync duration by provider — vertical bar */}
        <Card className="surface-elevated py-0">
          <CardContent className="p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("integration.analytics.avgDuration")}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={avgDurationByProvider} margin={{ left: -16, right: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="provider" tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} stroke="var(--border)" />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [`${v}ms`, t("integration.analytics.duration")]}
                />
                <Bar dataKey="ms" radius={[4, 4, 0, 0]}>
                  {avgDurationByProvider.map((entry) => (
                    <Cell
                      key={entry.provider}
                      fill={
                        entry.ms > 5000
                          ? COLORS.rose
                          : entry.ms > 2000
                            ? COLORS.amber
                            : COLORS.lime
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3 — credential health donut */}
      <Card className="surface-elevated py-0">
        <CardContent className="p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("integration.analytics.credentialHealth")}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={localizedCredentialHealth}
                dataKey="count"
                nameKey="label"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                <Cell fill={COLORS.lime} />
                <Cell fill={COLORS.amber} />
                <Cell fill={COLORS.rose} />
                <Cell fill={COLORS.info} />
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Legend
                iconType="circle"
                formatter={(v) => (
                  <span className="text-[10px] text-muted-foreground">{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "lime" | "amber" | "rose" | "cyan" | "violet";
}) {
  const cls = {
    lime: "border-lime/30 bg-lime/10 text-lime",
    amber: "border-amber/30 bg-amber/10 text-amber",
    rose: "border-rose/30 bg-rose/10 text-rose",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
    violet: "border-violet/30 bg-violet/10 text-violet",
  }[tone];
  return (
    <Card className={cn("surface-elevated py-0", cls)}>
      <CardContent className="flex items-center gap-2 p-3">
        {icon}
        <div>
          <div className="text-lg font-semibold leading-none text-foreground">{value}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AnalyticsView;
