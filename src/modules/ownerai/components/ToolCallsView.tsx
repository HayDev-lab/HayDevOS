"use client";

/**
 * ToolCallsView — table of all tool calls (latest first), with collapsible
 * args/result preview per row.
 */

import { useState, Fragment } from "react";
import { Wrench, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "../state";

export function ToolCallsView() {
  const { t } = useLocale();
  const { toolCalls } = useOwnerAiStore();
  const [openId, setOpenId] = useState<string | null>(null);

  if (toolCalls.length === 0) {
    return (
      <div className="surface-elevated flex flex-col items-center justify-center rounded-xl border border-border/60 p-10 text-center">
        <Wrench className="h-7 w-7 text-muted-foreground/40" />
        <h3 className="mt-2 text-sm font-semibold text-foreground">
          {t("ownerAi.toolCalls.empty")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("ownerAi.toolCalls.emptyBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-elevated overflow-hidden rounded-xl border border-border/60">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-border/60 bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.toolCalls.col.ts")}</th>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.toolCalls.col.tool")}</th>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.toolCalls.col.args")}</th>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.toolCalls.col.result")}</th>
              <th className="px-3 py-2 text-right font-semibold">{t("ownerAi.toolCalls.col.duration")}</th>
              <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.toolCalls.col.run")}</th>
              <th className="w-8 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {toolCalls.map((tc) => {
              const ok = tc.durationMs < 5000;
              const Icon = ok ? CheckCircle2 : AlertTriangle;
              const isOpen = openId === tc.id;
              return (
                <Fragment key={tc.id}>
                  <tr
                    className="cursor-pointer border-t border-border/40 hover:bg-muted/20"
                    onClick={() => setOpenId(isOpen ? null : tc.id)}
                  >
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      <div className="font-mono">{new Date(tc.ts).toLocaleTimeString()}</div>
                      <div className="text-[10px] text-muted-foreground/70">{relativeTime(tc.ts)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className={cn("h-3 w-3", ok ? "text-success" : "text-amber")} />
                        <span className="font-mono text-[11px] font-semibold text-cyan">{tc.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      <span className="font-mono">{summarizeArgs(tc.args)}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {tc.resultSummary}
                      {typeof tc.resultCount === "number" && (
                        <span className="ml-1 rounded bg-background/60 px-1 text-[10px] text-muted-foreground/70">
                          {tc.resultCount} items
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] text-foreground/80">{tc.durationMs}ms</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-[10px] text-muted-foreground/70">{tc.runId}</span>
                    </td>
                    <td className="px-2 py-2">
                      <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-border/40 bg-background/40">
                      <td colSpan={7} className="px-3 py-2">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                              {t("ownerAi.toolCall.args")}
                            </div>
                            <pre className="max-h-48 overflow-auto rounded border border-border/40 bg-background/60 p-2 text-[10px] leading-relaxed text-cyan/90">
                              {JSON.stringify(tc.args, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                              {t("ownerAi.toolCall.result")}
                            </div>
                            <pre className="max-h-48 overflow-auto rounded border border-border/40 bg-background/60 p-2 text-[10px] leading-relaxed text-foreground/80">
                              {tc.resultPreview}
                            </pre>
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

function summarizeArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args).filter(([k]) => k !== "__approvalId");
  if (entries.length === 0) return "—";
  return entries
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(", ")
    .slice(0, 80);
}
