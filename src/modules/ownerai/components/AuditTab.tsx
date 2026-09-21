"use client";

/**
 * AuditTab — full audit log + aggregate stats summary.
 *
 * Layout:
 *  - Top: stats summary cards (counts + provider/mode/status breakdowns).
 *  - Below: filterable audit-events table.
 *
 * Data comes from the shared store's `auditEvents` + `stats` (the latter is
 * populated by GET /api/owner-ai/state via the backend's `getAuditStats()`).
 */

import { useState, useMemo } from "react";
import {
  ScrollText,
  Filter,
  Activity,
  Cpu,
  Wrench,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "../state";
import type { AuditEvent, AuditStats } from "@/app/api/owner-ai/types";

const EVENT_TONE: Partial<Record<AuditEvent["type"], string>> = {
  run_start: "border-cyan/30 bg-cyan/[0.04] text-cyan",
  run_end: "border-cyan/30 bg-cyan/[0.04] text-cyan",
  llm_request: "border-violet/30 bg-violet/[0.04] text-violet",
  llm_response: "border-violet/30 bg-violet/[0.04] text-violet",
  tool_call: "border-cyan/30 bg-cyan/[0.04] text-cyan",
  action_proposed: "border-lime/30 bg-lime/[0.04] text-lime",
  action_executed: "border-lime/30 bg-lime/[0.04] text-lime",
  approval_requested: "border-amber/30 bg-amber/[0.04] text-amber",
  approval_decided: "border-amber/30 bg-amber/[0.04] text-amber",
  offline_fallback: "border-amber/30 bg-amber/[0.04] text-amber",
  error: "border-rose/30 bg-rose/[0.04] text-rose",
  message_appended: "border-border/40 bg-card/30 text-muted-foreground",
};

export function AuditTab() {
  const { t } = useLocale();
  const auditEvents = useOwnerAiStore((s) => s.auditEvents);
  const config = useOwnerAiStore((s) => s.config);
  // The store doesn't currently cache `stats` separately; derive from the
  // response shape directly. We re-fetch via refreshState() so the latest
  // stats are picked up — but we don't have stats in the store. To avoid
  // touching the backend store, compute approximate stats from auditEvents +
  // the other lists.
  const conversations = useOwnerAiStore((s) => s.conversations);
  const agentRuns = useOwnerAiStore((s) => s.agentRuns);
  const toolCalls = useOwnerAiStore((s) => s.toolCalls);
  const actions = useOwnerAiStore((s) => s.actions);
  const approvals = useOwnerAiStore((s) => s.approvals);

  const [typeFilter, setTypeFilter] = useState<string>("__all");
  const [openId, setOpenId] = useState<string | null>(null);

  // Compute the stats locally so the UI works even if the backend's stats
  // field isn't cached on the client store.
  const stats: AuditStats = useMemo(() => {
    const byProvider: Record<string, number> = {};
    const byMode: Record<string, number> = {};
    const byRunStatus: Record<string, number> = {};
    let onlineRuns = 0;
    let offlineRuns = 0;
    for (const r of agentRuns) {
      byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1;
      byMode[r.mode] = (byMode[r.mode] ?? 0) + 1;
      byRunStatus[r.status] = (byRunStatus[r.status] ?? 0) + 1;
      if (r.offline) offlineRuns++;
      else onlineRuns++;
    }
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const a of approvals) {
      if (a.status === "pending") pending++;
      else if (a.status === "approved") approved++;
      else if (a.status === "rejected") rejected++;
    }
    let executed = 0;
    let failed = 0;
    let pendingActions = 0;
    for (const a of actions) {
      if (a.status === "executed") executed++;
      else if (a.status === "failed") failed++;
      else if (a.status === "pending_approval") pendingActions++;
    }
    const lastRunAt = agentRuns.length
      ? agentRuns.reduce((acc, r) => (r.startedAt > acc ? r.startedAt : acc), agentRuns[0].startedAt)
      : null;
    const lastEventAt = auditEvents.length ? auditEvents[0].ts : null;
    return {
      conversations: conversations.length,
      agentRuns: agentRuns.length,
      toolCalls: toolCalls.length,
      actions: actions.length,
      approvals: approvals.length,
      auditEvents: auditEvents.length,
      pendingApprovals: pending,
      approvedApprovals: approved,
      rejectedApprovals: rejected,
      executedActions: executed,
      failedActions: failed,
      pendingApprovalActions: pendingActions,
      onlineRuns,
      offlineRuns,
      byProvider,
      byMode,
      byRunStatus,
      lastRunAt,
      lastEventAt,
    };
  }, [conversations, agentRuns, toolCalls, actions, approvals, auditEvents]);

  const eventTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of auditEvents) set.add(e.type);
    return Array.from(set).sort();
  }, [auditEvents]);

  const filtered = useMemo(() => {
    if (typeFilter === "__all") return auditEvents;
    return auditEvents.filter((e) => e.type === typeFilter);
  }, [auditEvents, typeFilter]);

  if (auditEvents.length === 0) {
    return (
      <div className="space-y-4">
        <StatsGrid stats={stats} promptVersion={config?.promptVersion ?? "—"} />
        <div className="surface-elevated flex flex-col items-center justify-center rounded-xl border border-border/60 p-10 text-center">
          <ScrollText className="h-7 w-7 text-muted-foreground/40" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">
            {t("ownerAi.audit.empty")}
          </h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            {t("ownerAi.audit.emptyBody")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatsGrid stats={stats} promptVersion={config?.promptVersion ?? "—"} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground/70">
          <Filter className="h-3 w-3" />
          {t("ownerAi.audit.filter.type")}
        </span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 rounded-md border border-border/60 bg-card/40 px-2 text-xs text-foreground"
        >
          <option value="__all">{t("ownerAi.audit.filter.all")}</option>
          {eventTypes.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[11px] text-muted-foreground/70">
          {filtered.length} / {auditEvents.length}
        </span>
      </div>

      <div className="surface-elevated overflow-hidden rounded-xl border border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-border/60 bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground/70">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.audit.col.ts")}</th>
                <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.audit.col.type")}</th>
                <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.audit.col.message")}</th>
                <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.audit.col.correlation")}</th>
                <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.audit.col.provider")}</th>
                <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.audit.col.prompt")}</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const tone = EVENT_TONE[e.type] ?? "border-border/40 bg-card/30 text-muted-foreground";
                const isOpen = openId === e.id;
                return (
                  <tr
                    key={e.id}
                    className="cursor-pointer border-t border-border/40 hover:bg-muted/20"
                    onClick={() => setOpenId(isOpen ? null : e.id)}
                  >
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      <div className="font-mono">{formatDateTime(e.ts)}</div>
                      <div className="text-[10px] text-muted-foreground/70">{relativeTime(e.ts)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                          tone,
                        )}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-foreground/80">
                      <div className="max-w-[420px] truncate" title={e.message}>
                        {e.message}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] text-muted-foreground/70">{e.correlationId}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {e.provider ?? "—"}
                      {e.model ? <span className="block text-[10px] text-muted-foreground/70">{e.model}</span> : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground/70">
                      {e.promptVersion ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className="text-[10px] text-muted-foreground/60">{isOpen ? "−" : "+"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ stats, promptVersion }: { stats: AuditStats; promptVersion: string }) {
  const { t } = useLocale();

  const cards: {
    icon: typeof Activity;
    label: string;
    value: string | number;
    tone: "lime" | "cyan" | "amber" | "rose" | "violet";
  }[] = [
    { icon: Activity, label: t("ownerAi.audit.stats.conversations"), value: stats.conversations, tone: "violet" },
    { icon: Cpu, label: t("ownerAi.audit.stats.runs"), value: stats.agentRuns, tone: "cyan" },
    { icon: Wrench, label: t("ownerAi.audit.stats.toolCalls"), value: stats.toolCalls, tone: "cyan" },
    { icon: Zap, label: t("ownerAi.audit.stats.actions"), value: stats.actions, tone: "lime" },
    { icon: ShieldAlert, label: t("ownerAi.audit.stats.approvals"), value: stats.approvals, tone: "amber" },
    { icon: ScrollText, label: t("ownerAi.audit.stats.auditEvents"), value: stats.auditEvents, tone: "violet" },
    { icon: Clock, label: t("ownerAi.audit.stats.pending"), value: stats.pendingApprovals, tone: "amber" },
    { icon: CheckCircle2, label: t("ownerAi.audit.stats.approved"), value: stats.approvedApprovals, tone: "lime" },
    { icon: XCircle, label: t("ownerAi.audit.stats.rejected"), value: stats.rejectedApprovals, tone: "rose" },
    { icon: Zap, label: t("ownerAi.audit.stats.executed"), value: stats.executedActions, tone: "lime" },
    { icon: XCircle, label: t("ownerAi.audit.stats.failed"), value: stats.failedActions, tone: "rose" },
    { icon: CheckCircle2, label: t("ownerAi.audit.stats.onlineRuns"), value: stats.onlineRuns, tone: "lime" },
    { icon: XCircle, label: t("ownerAi.audit.stats.offlineRuns"), value: stats.offlineRuns, tone: "amber" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("ownerAi.audit.stats.title")}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="surface-elevated rounded-lg border border-border/60 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded",
                    c.tone === "lime" && "bg-lime/10 text-lime",
                    c.tone === "cyan" && "bg-cyan/10 text-cyan",
                    c.tone === "amber" && "bg-amber/10 text-amber",
                    c.tone === "rose" && "bg-rose/10 text-rose",
                    c.tone === "violet" && "bg-violet/10 text-violet",
                  )}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <span className="font-mono text-base font-semibold text-foreground">
                  {c.value}
                </span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {c.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <BreakdownCard
          title={t("ownerAi.audit.byProvider")}
          data={stats.byProvider}
          tone="cyan"
        />
        <BreakdownCard
          title={t("ownerAi.audit.byMode")}
          data={stats.byMode}
          tone="violet"
        />
        <BreakdownCard
          title={t("ownerAi.audit.byStatus")}
          data={stats.byRunStatus}
          tone="lime"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/80">
        {stats.lastRunAt && (
          <span>
            <span className="uppercase tracking-wider text-muted-foreground/60">
              {t("ownerAi.audit.stats.lastRun")}:
            </span>{" "}
            <span className="font-mono">{formatDateTime(stats.lastRunAt)}</span>
          </span>
        )}
        {stats.lastEventAt && (
          <span>
            <span className="uppercase tracking-wider text-muted-foreground/60">
              {t("ownerAi.audit.stats.lastEvent")}:
            </span>{" "}
            <span className="font-mono">{formatDateTime(stats.lastEventAt)}</span>
          </span>
        )}
        <span>
          <span className="uppercase tracking-wider text-muted-foreground/60">
            {t("ownerAi.settings.promptVersion")}:
          </span>{" "}
          <span className="font-mono">{promptVersion}</span>
        </span>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  data,
  tone,
}: {
  title: string;
  data: Record<string, number>;
  tone: "lime" | "cyan" | "amber" | "violet";
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div className="surface-elevated rounded-lg border border-border/60 p-3">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </h4>
        <p className="mt-1 text-[11px] text-muted-foreground/60">—</p>
      </div>
    );
  }
  const max = Math.max(...entries.map(([, v]) => v));
  return (
    <div className="surface-elevated rounded-lg border border-border/60 p-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h4>
      <ul className="mt-2 space-y-1.5">
        {entries.map(([k, v]) => (
          <li key={k} className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-foreground/80">{k}</span>
              <span className="font-mono text-muted-foreground">{v}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted/40">
              <div
                className={cn(
                  "h-full rounded-full",
                  tone === "lime" && "bg-lime/60",
                  tone === "cyan" && "bg-cyan/60",
                  tone === "amber" && "bg-amber/60",
                  tone === "violet" && "bg-violet/60",
                )}
                style={{ width: `${max > 0 ? (v / max) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
