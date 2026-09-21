"use client";

/**
 * ChatMessage — renders a single user or assistant chat bubble.
 *
 * Layout:
 *  - user: right-aligned, lime-tinted bubble.
 *  - assistant: left-aligned, graphite bubble with lime avatar. Markdown body.
 *
 * Below the assistant bubble:
 *  - tool-call cards (collapsible, cyan)
 *  - action cards (lime for safe executed, amber for pending risky, rose for rejected)
 *  - approval cards (amber pending, lime approved, rose rejected)
 *
 * Empty assistant content + isPending shows a typing indicator.
 */

import { Sparkles, User, ShieldCheck, Zap, AlertCircle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  OwnerAiMessage,
  ToolCallRecord,
  ProposedAction,
  Approval,
} from "@/app/api/owner-ai/types";
import { useLocale } from "@/lib/i18n";
import { Markdown } from "./Markdown";
import { ToolCallCard } from "./ToolCallCard";
import { ApprovalCard } from "./ApprovalCard";
import { TypingDots } from "./TypingDots";

interface ChatMessageProps {
  message: OwnerAiMessage;
  toolCalls: ToolCallRecord[];
  actions: ProposedAction[];
  approvals: Approval[];
  isPending?: boolean;
  decidedBy: string;
  compact?: boolean;
}

export function ChatMessage({
  message,
  toolCalls,
  actions,
  approvals,
  isPending,
  decidedBy,
  compact = false,
}: ChatMessageProps) {
  const { t } = useLocale();
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 px-1">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-tr-sm border border-lime/30 bg-lime/[0.08] px-3 py-2 text-xs text-foreground",
            compact ? "text-[11px]" : "text-xs",
          )}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        </div>
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime">
          <User className="h-3 w-3" />
        </span>
      </div>
    );
  }

  // Assistant
  const toolCallIds = new Set(message.toolCallIds ?? []);
  const actionIds = new Set(message.actionIds ?? []);
  const approvalIds = new Set(message.approvalIds ?? []);
  const msgToolCalls = toolCalls.filter((tc) => toolCallIds.has(tc.id));
  const msgActions = actions.filter((a) => actionIds.has(a.id));
  const msgApprovals = approvals.filter((a) => approvalIds.has(a.id));

  const showTyping = isPending && !message.content;

  return (
    <div className="flex gap-2 px-1">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime/15 text-lime ring-1 ring-lime/30">
        <Sparkles className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div
          className={cn(
            "max-w-[92%] rounded-2xl rounded-tl-sm border border-border/60 bg-card/60 px-3 py-2",
            message.offline && "border-amber/30 bg-amber/[0.03]",
          )}
        >
          {showTyping ? (
            <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
              <TypingDots />
              <span>{t("ownerAi.chat.thinking")}</span>
            </div>
          ) : message.content ? (
            <div className="space-y-1.5">
              <Markdown>{message.content}</Markdown>
              {message.offline && (
                <div className="inline-flex items-center gap-1 rounded border border-amber/30 bg-amber/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber">
                  <WifiOff className="h-2.5 w-2.5" />
                  {t("ownerAi.chat.offlineBadge")}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 italic">{t("ownerAi.chat.empty")}</p>
          )}
        </div>

        {/* Tool-call cards */}
        {msgToolCalls.length > 0 && (
          <div className="space-y-1.5">
            {msgToolCalls.map((tc) => (
              <ToolCallCard key={tc.id} record={tc} compact={compact} />
            ))}
          </div>
        )}

        {/* Action cards (safe executed + non-pending risky) */}
        {msgActions.length > 0 && (
          <div className="space-y-1.5">
            {msgActions.map((a) => (
              <ActionCard key={a.id} action={a} />
            ))}
          </div>
        )}

        {/* Approval cards */}
        {msgApprovals.length > 0 && (
          <div className="space-y-1.5">
            {msgApprovals.map((ap) => (
              <ApprovalCard key={ap.id} approval={ap} decidedBy={decidedBy} compact={compact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: ProposedAction }) {
  const Icon =
    action.safety === "safe"
      ? Zap
      : action.status === "rejected"
        ? AlertCircle
        : ShieldCheck;
  const tone =
    action.safety === "safe"
      ? "lime"
      : action.status === "rejected"
        ? "rose"
        : action.status === "executed"
          ? "lime"
          : "amber";
  const toneClasses: Record<string, string> = {
    lime: "border-lime/30 bg-lime/[0.04]",
    amber: "border-amber/30 bg-amber/[0.04]",
    rose: "border-rose/30 bg-rose/[0.04]",
  };
  const iconClasses: Record<string, string> = {
    lime: "bg-lime/10 text-lime",
    amber: "bg-amber/10 text-amber",
    rose: "bg-rose/10 text-rose",
  };
  return (
    <div className={cn("rounded-lg border p-2 text-xs", toneClasses[tone])}>
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded", iconClasses[tone])}>
          <Icon className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold text-foreground">{action.action}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {action.safety} · {action.status}
            </span>
          </div>
          {action.result && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{action.result}</p>
          )}
        </div>
      </div>
    </div>
  );
}
