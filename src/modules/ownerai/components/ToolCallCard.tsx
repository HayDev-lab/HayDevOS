"use client";

/**
 * ToolCallCard — collapsible card showing a single tool call result.
 *
 * Card chrome: cyan-tinted (cyan = read tools). Shows the tool name, args
 * (as monospace JSON), result summary, and a collapsible preview pane.
 *
 * Reduced-motion safe (no animations beyond the collapsible's height toggle).
 */

import { useState } from "react";
import {
  ChevronRight,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCallRecord } from "@/app/api/owner-ai/types";
import { useLocale } from "@/lib/i18n";

interface ToolCallCardProps {
  record: ToolCallRecord;
  /** Default expanded state. */
  defaultOpen?: boolean;
  /** Compact variant (smaller padding, smaller text). */
  compact?: boolean;
}

export function ToolCallCard({ record, defaultOpen = false, compact = false }: ToolCallCardProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const ok = record.durationMs < 5000;
  const Icon = ok ? CheckCircle2 : AlertTriangle;

  function copyArgs() {
    navigator.clipboard.writeText(JSON.stringify(record.args, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-cyan/20 bg-cyan/[0.03] text-xs",
        compact ? "p-2" : "p-2.5",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan/10 text-cyan">
          <Wrench className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold text-cyan">{record.name}</span>
            <Icon
              className={cn(
                "h-3 w-3 shrink-0",
                ok ? "text-success" : "text-amber",
              )}
            />
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {record.durationMs} {t("common.millisecond")}
              {typeof record.resultCount === "number" ? ` · ${t("ownerAi.toolCall.items", { count: record.resultCount })}` : ""}
            </span>
            <ChevronRight
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                open && "rotate-90",
              )}
            />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{record.resultSummary}</p>
        </div>
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-t border-cyan/15 pt-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {t("ownerAi.toolCall.args")}
              </span>
              <button
                type="button"
                onClick={copyArgs}
                className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Copy className="h-2.5 w-2.5" />
                {copied ? t("ownerAi.toolCall.copied") : t("ownerAi.toolCall.copy")}
              </button>
            </div>
            <pre className="max-h-40 overflow-auto rounded border border-border/40 bg-background/60 p-1.5 text-[10px] leading-relaxed text-cyan/90">
              {JSON.stringify(record.args, null, 2)}
            </pre>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t("ownerAi.toolCall.result")}
            </div>
            <pre className="max-h-60 overflow-auto rounded border border-border/40 bg-background/60 p-1.5 text-[10px] leading-relaxed text-foreground/80">
              {record.resultPreview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
