"use client";

/**
 * HayDevOS DashboardView — executive landing page.
 *
 * Renders KPI cards (with sparklines via recharts), a "Needs attention" feed,
 * a quick-actions row, and a module-status grid.
 *
 * This component is wired into the module registry for the `dashboard` module.
 * Module views are resolved through the central registry.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  TrendingUp,
  Circle,
  ArrowRight,
  Plus,
  FileText,
  Upload,
  ClipboardCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { t as translateText, type Locale, useLocale } from "@/lib/i18n";
import { useAuth } from "@/components/auth/AuthContext";
import { useAppStore } from "@/lib/store/app-store";
import {
  mockKpis,
  mockLeads,
  mockDocuments,
  mockAutomations,
  mockIntegrations,
} from "@/lib/mock";
import { ModuleRegistry } from "@/lib/modules/registry";
import { formatDate, toneClasses, cn } from "@/lib/utils";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildAttentionFeed as buildControlAttentionFeed, ControlView } from "@/modules/control";

// ─────────────────────────────────────────────────────────────────────────────
// "Needs attention" feed — derived from mock data + a couple of inline items.
// ─────────────────────────────────────────────────────────────────────────────

type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

interface AttentionItem {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  module: string;
  ts: string;
}

const PRIORITY_TONE: Record<Priority, "rose" | "amber" | "cyan" | "muted"> = {
  CRITICAL: "rose",
  HIGH: "amber",
  MEDIUM: "cyan",
  INFO: "muted",
};

function buildAttentionFeed(locale: Locale): AttentionItem[] {
  return buildControlAttentionFeed(
    (key, params) => translateText(key, locale, params),
  )
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      priority: item.priority,
      module: item.moduleId,
      ts: item.ts,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI card with sparkline
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  deltaPct,
  sparkline,
  tone,
  deltaLabel,
}: {
  label: string;
  value: string;
  deltaPct: number;
  sparkline: number[];
  tone: "lime" | "cyan" | "amber" | "rose" | "violet";
  deltaLabel: string;
}) {
  const positive = deltaPct >= 0;
  const toneCls = toneClasses(tone);
  const data = useMemo(() => sparkline.map((v, i) => ({ i, v })), [sparkline]);
  const stroke = `var(--accent-${tone})`;

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
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
            positive
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {positive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : (
            <ArrowDownRight className="h-3 w-3" />
          )}
          {positive ? "+" : ""}
          {deltaPct.toFixed(1)}%
        </span>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2 px-4 pb-3">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {deltaLabel}
        </span>
        <span className={cn("h-1.5 w-1.5 rounded-full", toneCls.dot)} aria-hidden />
      </div>

      {/* Sparkline */}
      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${tone}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={1.75}
              fill={`url(#grad-${tone})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick action
// ─────────────────────────────────────────────────────────────────────────────

interface QuickAction {
  icon: LucideIcon;
  labelKey: string;
  onClick: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module health dot — derived from mock data for the dashboard surface.
// ─────────────────────────────────────────────────────────────────────────────

function moduleHealth(moduleId: string): "ok" | "warn" | "err" {
  switch (moduleId) {
    case "leados":
      return mockLeads.some((l) => l.slaBreached) ? "warn" : "ok";
    case "autopilot":
      return mockAutomations.some((a) => a.runs.failed > 0) ? "err" : "ok";
    case "connect":
      return mockIntegrations.some((i) => i.status === "disconnected" || i.status === "error")
        ? "err"
        : mockIntegrations.some((i) => i.status === "reauth_required" || i.status === "degraded")
          ? "warn"
          : "ok";
    case "docsmart":
      return mockDocuments.some((d) => d.status === "pending") ? "warn" : "ok";
    default:
      return "ok";
  }
}

function HealthDot({ status }: { status: "ok" | "warn" | "err" }) {
  const cls =
    status === "ok"
      ? "bg-success"
      : status === "warn"
        ? "bg-warning"
        : "bg-destructive";
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-60",
          cls,
          status !== "ok" && "animate-pulse-dot",
        )}
      />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", cls)} />
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardView
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardView() {
  const { locale, t } = useLocale();
  const { session } = useAuth();
  const { user, activeOrganization: org } = session;
  const { setActiveModule } = useAppStore();
  const attention = useMemo(() => buildAttentionFeed(locale), [locale]);

  const today = formatDate(new Date(), locale);

  const kpiCards = mockKpis.slice(0, 9);

  const quickActions: QuickAction[] = [
    {
      icon: Plus,
      labelKey: "dashboard.createLead",
      onClick: () => toast.success(t("shell.toast.leadCreated")),
    },
    {
      icon: FileText,
      labelKey: "dashboard.createQuote",
      onClick: () => toast.success(t("shell.toast.quoteCreated")),
    },
    {
      icon: Upload,
      labelKey: "dashboard.uploadDoc",
      onClick: () => toast.success(t("shell.toast.docUploaded")),
    },
    {
      icon: ClipboardCheck,
      labelKey: "dashboard.runAudit",
      onClick: () => {
        toast.success(t("shell.toast.auditRun"));
        setActiveModule("audit");
      },
    },
  ];

  if (user.role === "OWNER") {
    return <ControlView ownerHome />;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-6 flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t("dashboard.welcome", { name: user.name })}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("dashboard.subhead", { org: org.name, date: today })}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-lime" />
            <span>{t("shell.footer.operational")}</span>
          </div>
        </div>
      </motion.div>

      {/* KPI grid */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("dashboard.kpis")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {kpiCards.map((kpi, i) => (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
            >
              <KpiCard
                label={t(kpi.labelKey) || kpi.label}
                value={kpi.displayValue}
                deltaPct={kpi.deltaPct}
                sparkline={kpi.sparkline}
                tone={kpi.tone}
                deltaLabel={t("dashboard.deltaLabel")}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-lime" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("dashboard.quickActions")}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <Button
                key={qa.labelKey}
                variant="outline"
                onClick={qa.onClick}
                className="h-auto justify-start gap-3 border-border bg-card/60 px-4 py-3 text-left text-sm font-medium hover:border-primary/40 hover:bg-card"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-lime">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-foreground">{t(qa.labelKey)}</span>
              </Button>
            );
          })}
        </div>
      </section>

      {/* Needs attention + Module status */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Needs attention */}
        <Card className="surface-elevated lg:col-span-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("dashboard.needsAttention")}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {t("dashboard.needsAttentionSub")}
              </span>
            </div>
            <ScrollArea className="h-[420px] overflow-hidden">
              <ul className="divide-y divide-border">
                {attention.map((item) => {
                  const tone = PRIORITY_TONE[item.priority];
                  const toneCls = toneClasses(tone);
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          toneCls.dot,
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border px-1.5 py-0 text-[10px] uppercase tracking-wider",
                              toneCls.border,
                              toneCls.bg,
                              toneCls.text,
                            )}
                          >
                            {t(`dashboard.priority.${item.priority}`)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.body}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveModule(item.module)}
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t("dashboard.drilldown")}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </li>
                  );
                })}
                {attention.length === 0 && (
                  <li className="flex flex-col items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
                    <Circle className="h-4 w-4 text-success" />
                    {t("shell.notifications.empty")}
                  </li>
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Module status */}
        <Card className="surface-elevated lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <Sparkles className="h-4 w-4 text-violet" />
              <h2 className="text-sm font-semibold text-foreground">
                {t("dashboard.moduleStatus")}
              </h2>
            </div>
            <ScrollArea className="h-[420px] overflow-hidden">
              <ul className="divide-y divide-border">
                {ModuleRegistry.filter((m) => m.id !== "settings").map((m) => {
                  const health = moduleHealth(m.id);
                  const Icon = m.icon;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/30"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {t(m.nameKey)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t(m.id === "dashboard" ? "dashboard.moduleDescription" : `${m.nameKey}.desc`)}
                        </p>
                      </div>
                      <HealthDot status={health} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveModule(m.id)}
                        className="shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {t("dashboard.open")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      {/* Footer accent */}
      <div className="mt-8 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
        <span>{t("shell.footer.version")}</span>
        <span>{t("dashboard.moduleCount", { count: ModuleRegistry.length })}</span>
      </div>
    </div>
  );
}

export default DashboardView;
