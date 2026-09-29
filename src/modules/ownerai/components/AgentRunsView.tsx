"use client";

/**
 * AgentRunsView — table of agent runs with status, duration, tool call count.
 */

import { Activity, Eye, Hand, Bot, CheckCircle2, XCircle, Loader2, Zap } from "lucide-react";
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

export function AgentRunsView() {
  const { t } = useLocale();
  const { agentRuns } = useOwnerAiStore();

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
            </tr>
          </thead>
          <tbody>
            {agentRuns.map((r) => {
              const MIcon = MODE_ICONS[r.mode] ?? Activity;
              const sMeta = STATUS_META[r.status];
              const SIcon = sMeta.icon;
              return (
                <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
