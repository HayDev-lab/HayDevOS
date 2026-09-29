"use client";

/**
 * Control — IntegrationsView.
 *
 * Integration health drilldown: connected count, degraded, reauth required,
 * recent failures. Clickable → Integration Hub.
 */

import { motion } from "framer-motion";
import { Plug, AlertTriangle, Activity } from "lucide-react";

import { useLocale } from "@/lib/i18n";
import { useAppStore } from "@/lib/store/app-store";
import { cn, relativeTime, toneClasses } from "@/lib/utils";
import type { IntegrationHealthSummary } from "../types";
import { KpiCard } from "./KpiCard";

const STATUS_TONE: Record<string, "lime" | "amber" | "rose" | "cyan" | "violet"> = {
  connected: "lime",
  degraded: "amber",
  reauth_required: "amber",
  error: "rose",
  disconnected: "rose",
};

const PROVIDER_LABEL: Record<string, string> = {
  stripe: "Stripe",
  hubspot: "HubSpot",
  slack: "Slack",
  gmail: "Gmail",
  quickbooks: "QuickBooks",
  zapier: "Zapier",
  meta: "Meta",
  google: "Google",
};

export function IntegrationsView({ summary }: { summary: IntegrationHealthSummary }) {
  const { t, locale } = useLocale();
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summary.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By status */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.integrations.byStatus")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.byStatus.map((s) => {
              const cls = toneClasses(STATUS_TONE[s.status] ?? "cyan");
              return (
                <li
                  key={s.status}
                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", cls.dot)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{t(s.labelKey)}</span>
                      <span className="font-mono text-xs text-foreground">{s.count}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Failing integrations */}
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.integrations.failing")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.failing.map((i) => {
              const cls = toneClasses(STATUS_TONE[i.status] ?? "amber");
              return (
                <li
                  key={i.id}
                  className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border hover:bg-muted/30"
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                    cls.bg, cls.border,
                  )}>
                    <Plug className={cn("h-4 w-4", cls.text)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {PROVIDER_LABEL[i.provider] ?? i.provider}
                      </span>
                      <span className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        cls.bg, cls.border, cls.text,
                      )}>
                        {i.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                      {i.eventsProcessed.toLocaleString("en-US")} events ·{" "}
                      {i.lastSyncAt ? relativeTime(i.lastSyncAt, locale) : t("control.integrations.neverSynced")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModule("connect")}
                    className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                    aria-label={t("control.attention.open")}
                  >
                    {t("control.attention.open")}
                  </button>
                </li>
              );
            })}
            {summary.failing.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                {t("control.integrations.allHealthy")}
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      {/* Recent failures */}
      {summary.recentFailures.length > 0 ? (
        <section className="surface-elevated rounded-xl border border-border/60 p-4">
          <header className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("control.integrations.recentFailures")}
            </h3>
          </header>
          <ul className="space-y-2">
            {summary.recentFailures.map((f) => (
              <li
                key={f.id}
                className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 transition-colors hover:border-border"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {PROVIDER_LABEL[f.provider] ?? f.provider}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                    {f.message} · {relativeTime(f.ts, locale)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule("connect")}
                  className="shrink-0 rounded-md border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-muted/40 group-hover:opacity-100"
                  aria-label={t("control.attention.open")}
                >
                  {t("control.attention.open")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </motion.div>
  );
}
