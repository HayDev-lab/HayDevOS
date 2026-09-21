"use client";

/**
 * ApprovalCard — pending or decided approval card.
 *
 * Card chrome:
 *  - pending: amber-tinted, prominent Approve / Reject buttons.
 *  - approved: lime-tinted, shows executor + result.
 *  - rejected: rose-tinted, shows rejector + reason.
 *
 * Reduced-motion safe.
 */

import { useState } from "react";
import { Check, X, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Approval } from "@/app/api/owner-ai/types";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "../state";

interface ApprovalCardProps {
  approval: Approval;
  /** Decided-by user id (passed from the panel/view). */
  decidedBy: string;
  compact?: boolean;
}

export function ApprovalCard({ approval, decidedBy, compact = false }: ApprovalCardProps) {
  const { t } = useLocale();
  const decideApproval = useOwnerAiStore((s) => s.decideApproval);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const isPending = approval.status === "pending";

  async function handleApprove() {
    setBusy(true);
    try {
      await decideApproval(approval.id, "approved", decidedBy);
    } finally {
      setBusy(false);
    }
  }
  async function handleReject() {
    setBusy(true);
    try {
      await decideApproval(approval.id, "rejected", decidedBy, reason || undefined);
      setShowReason(false);
      setReason("");
    } finally {
      setBusy(false);
    }
  }

  const tone = isPending
    ? "amber"
    : approval.status === "approved"
      ? "lime"
      : "rose";

  const toneClasses: Record<string, string> = {
    amber: "border-amber/30 bg-amber/[0.04]",
    lime: "border-lime/30 bg-lime/[0.04]",
    rose: "border-rose/30 bg-rose/[0.04]",
  };

  return (
    <div className={cn("rounded-lg border text-xs", toneClasses[tone], compact ? "p-2" : "p-2.5")}>
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded",
            tone === "amber" && "bg-amber/10 text-amber",
            tone === "lime" && "bg-lime/10 text-lime",
            tone === "rose" && "bg-rose/10 text-rose",
          )}
        >
          <ShieldAlert className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold text-foreground">
              {approval.action}
            </span>
            <span
              className={cn(
                "ml-auto rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                tone === "amber" && "bg-amber/15 text-amber",
                tone === "lime" && "bg-lime/15 text-lime",
                tone === "rose" && "bg-rose/15 text-rose",
              )}
            >
              {t(`ownerAi.approval.status.${approval.status}`)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{approval.description}</p>

          {/* Args preview (monospace, single line) */}
          <pre className="mt-1 max-h-16 overflow-auto rounded border border-border/40 bg-background/60 p-1.5 text-[10px] leading-relaxed text-foreground/80">
            {JSON.stringify(
              Object.fromEntries(
                Object.entries(approval.args).filter(([k]) => k !== "__approvalId"),
              ),
              null,
              2,
            )}
          </pre>

          {/* Decided footer */}
          {!isPending && (
            <div className="mt-1.5 text-[10px] text-muted-foreground/80">
              {approval.status === "approved" ? (
                <span>
                  ✓ {t("ownerAi.approval.approvedBy")}{" "}
                  <span className="font-mono text-lime">{approval.decidedBy}</span>
                  {approval.decidedAt ? ` · ${new Date(approval.decidedAt).toLocaleString()}` : ""}
                </span>
              ) : (
                <span>
                  ✗ {t("ownerAi.approval.rejectedBy")}{" "}
                  <span className="font-mono text-rose">{approval.decidedBy}</span>
                  {approval.decidedAt ? ` · ${new Date(approval.decidedAt).toLocaleString()}` : ""}
                  {approval.reason ? ` · ${approval.reason}` : ""}
                </span>
              )}
            </div>
          )}

          {/* Pending actions */}
          {isPending && (
            <div className="mt-2 space-y-2">
              {!showReason ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApprove}
                    disabled={busy}
                    className="h-7 gap-1 rounded-md bg-lime/90 px-2.5 text-[11px] font-semibold text-background hover:bg-lime"
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    {t("ownerAi.approval.approve")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReason(true)}
                    disabled={busy}
                    className="h-7 gap-1 rounded-md border-rose/40 bg-rose/5 px-2.5 text-[11px] font-semibold text-rose hover:bg-rose/10"
                  >
                    <X className="h-3 w-3" />
                    {t("ownerAi.approval.reject")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("ownerAi.approval.reasonPlaceholder")}
                    rows={2}
                    className="resize-none border-border/60 bg-background/60 text-[11px]"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleReject}
                      disabled={busy}
                      className="h-7 gap-1 rounded-md bg-rose/90 px-2.5 text-[11px] font-semibold text-background hover:bg-rose"
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      {t("ownerAi.approval.confirmReject")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowReason(false);
                        setReason("");
                      }}
                      disabled={busy}
                      className="h-7 px-2.5 text-[11px] text-muted-foreground"
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
