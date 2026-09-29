"use client";

/**
 * AgentRunsTab — table of agent runs with status, duration, tool-call count,
 * action count, approval count, mode, provider, and correlation id.
 *
 * Each row expands to show the full record details (run id, conversation id,
 * model, error if any, etc.).
 */

import { useState, Fragment } from "react";
import {
  Activity,
  Eye,
  Hand,
  Bot,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  ChevronRight,
} from "lucide-react";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "../state";
import type { AgentRun } from "@/app/api/owner-ai/types";

const MODE_ICONS: Record<string, typeof Eye> = {
  OBSERVE: Eye,
  ASSIST: Hand,
  AUTO: Bot,
};

const STATUS_META: Record<
  AgentRun["status"],
  { icon: typeof CheckCircle2; tone: "lime" | "rose" | "amber" | "cyan" }
> = {
  succeeded: { icon: CheckCircle2, tone: "lime" },
  failed: { icon: XCircle, tone: "rose" },
  running: { icon: Loader2, tone: "amber" },
  offline: { icon: Zap, tone: "cyan" },
};

export function AgentRunsTab() {
  const { t } = useLocale();
  const agentRuns = useOwnerAiStore((s) => s.agentRuns);
  const [openId, setOpenId] = useState<string | null>(null);

  if (agentRuns.length === 0) {
    return (
      <EmptyState
        title={t("ownerAi.runs.empty")}
        body={t("ownerAi.runs.emptyBody")}
      />
    );
  }

  return (
    <div className="surface-elevated overflow-hidden rounded-xl border border-border/60">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-border/60 bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.runs.col.started")}</th>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.runs.col.mode")}</th>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.runs.col.status")}</th>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.runs.col.provider")}</th>
              <th className="px-3 py-2 text-right font-semibold">{t("ownerAi.runs.col.tools")}</th>
              <th className="px-3 py-2 text-right font-semibold">{t("ownerAi.runs.col.actions")}</th>
              <th className="px-3 py-2 text-right font-semibold">{t("ownerAi.runs.col.approvals")}</th>
              <th className="px-3 py-2 text-right font-semibold">{t("ownerAi.runs.col.duration")}</th>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.runs.col.correlation")}</th>
              <th className="w-8 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {agentRuns.map((r) => {
              const MIcon = MODE_ICONS[r.mode] ?? Activity;
              const sMeta = STATUS_META[r.status];
              const SIcon = sMeta.icon;
              const isOpen = openId === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    className="cursor-pointer border-t border-border/40 hover:bg-muted/20"
                    onClick={() => setOpenId(isOpen ? null : r.id)}
                  >
                    <td className="px-3 py-2 text-foreground/80">
                      <div className="font-mono text-[11px]">{formatDateTime(r.startedAt)}</div>
                      <div className="text-[10px] text-muted-foreground/70">{relativeTime(r.startedAt)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                        <MIcon className="h-3 w-3 text-muted-foreground" />
                        {r.mode}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          sMeta.tone === "lime" && "bg-lime/15 text-lime",
                          sMeta.tone === "rose" && "bg-rose/15 text-rose",
                          sMeta.tone === "amber" && "bg-amber/15 text-amber",
                          sMeta.tone === "cyan" && "bg-cyan/15 text-cyan",
                        )}
                      >
                        <SIcon className={cn("h-2.5 w-2.5", r.status === "running" && "animate-spin")} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {r.provider === "openai-compatible" ? "online LLM" : "offline-fallback"}
                      {r.model ? <span className="block text-[10px] text-muted-foreground/70">{r.model}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-foreground/80">{r.toolCallCount}</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-foreground/80">{r.actionCount}</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-foreground/80">{r.approvalCount}</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-foreground/80">
                      {r.durationMs != null ? `${r.durationMs}ms` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] text-muted-foreground/70">{r.correlationId}</span>
                    </td>
                    <td className="px-2 py-2">
                      <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-border/40 bg-background/40">
                      <td colSpan={10} className="px-3 py-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1 text-[11px]">
                            <DetailLine label="runId" value={r.id} mono />
                            <DetailLine label="conversationId" value={r.conversationId} mono />
                            <DetailLine label="correlationId" value={r.correlationId} mono />
                            <DetailLine label="provider" value={r.provider} />
                            <DetailLine label="model" value={r.model ?? "—"} />
                            <DetailLine
                              label="offline"
                              value={r.offline ? "true" : "false"}
                            />
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <DetailLine label="startedAt" value={formatDateTime(r.startedAt)} mono />
                            <DetailLine label="endedAt" value={r.endedAt ? formatDateTime(r.endedAt) : "—"} mono />
                            <DetailLine label="durationMs" value={r.durationMs != null ? `${r.durationMs}ms` : "—"} mono />
                            <DetailLine label="toolCallCount" value={String(r.toolCallCount)} mono />
                            <DetailLine label="actionCount" value={String(r.actionCount)} mono />
                            <DetailLine label="approvalCount" value={String(r.approvalCount)} mono />
                            {r.error && (
                              <div className="mt-2 rounded border border-rose/30 bg-rose/[0.04] p-2 text-[11px] text-rose">
                                {r.error}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-32 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <span className={cn("min-w-0 flex-1 break-all text-foreground/80", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-elevated flex flex-col items-center justify-center rounded-xl border border-border/60 p-10 text-center">
      <Activity className="h-7 w-7 text-muted-foreground/40" />
      <h3 className="mt-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
