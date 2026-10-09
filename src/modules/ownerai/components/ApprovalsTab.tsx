"use client";

/**
 * ApprovalsTab — pending + history of risky-action approvals.
 *
 * Layout:
 *  - Top: pending approvals (cards with inline Approve / Reject buttons).
 *  - Below: history table (decided approvals).
 *
 * Uses the shared ApprovalCard component (already wired to decideApproval).
 */

import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { cn, relativeTime, formatDateTime } from "@/lib/utils";
import { useLocale } from "@/lib/i18n";
import { useOwnerAiStore } from "../state";
import { ApprovalCard } from "./ApprovalCard";
import type { Approval } from "@/app/api/owner-ai/types";

export function ApprovalsTab() {
  const { t } = useLocale();
  const approvals = useOwnerAiStore((s) => s.approvals);

  const pending = approvals.filter((a) => a.status === "pending");
  const history = approvals
    .filter((a) => a.status !== "pending")
    .sort((a, b) => {
      const at = a.decidedAt ? new Date(a.decidedAt).getTime() : 0;
      const bt = b.decidedAt ? new Date(b.decidedAt).getTime() : 0;
      return bt - at;
    });

  if (approvals.length === 0) {
    return (
      <div className="surface-elevated flex flex-col items-center justify-center rounded-xl border border-border/60 p-10 text-center">
        <ShieldAlert className="h-7 w-7 text-muted-foreground/40" />
        <h3 className="mt-2 text-sm font-semibold text-foreground">
          {t("ownerAi.approvals.empty")}
        </h3>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {t("ownerAi.approvals.emptyBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Pending */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber">
          <ShieldAlert className="h-3.5 w-3.5" />
          {t("ownerAi.approvals.pendingTitle")}
          <span className="rounded bg-amber/15 px-1.5 py-0.5 text-[10px] text-amber">
            {pending.length}
          </span>
        </h3>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-border/40 bg-card/30 px-3 py-4 text-center text-[11px] text-muted-foreground/70">
            {t("ownerAi.approvals.pendingEmpty")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {pending.map((a) => (
              <ApprovalCard
                key={a.id}
                approval={a}
              />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t("ownerAi.approvals.historyTitle")}
          <span className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {history.length}
          </span>
        </h3>
        {history.length === 0 ? (
          <p className="rounded-lg border border-border/40 bg-card/30 px-3 py-4 text-center text-[11px] text-muted-foreground/70">
            {t("ownerAi.approvals.historyEmpty")}
          </p>
        ) : (
          <div className="surface-elevated overflow-hidden rounded-xl border border-border/60">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border/60 bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.approvals.col.action")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.approvals.col.description")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.approvals.col.args")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.approvals.col.requestedAt")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.approvals.col.decidedAt")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.approvals.col.decidedBy")}</th>
                    <th className="px-3 py-2 text-left font-semibold">{t("ownerAi.approvals.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((a) => (
                    <HistoryRow key={a.id} approval={a} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ approval }: { approval: Approval }) {
  const { t, locale } = useLocale();
  const tone = approval.status === "approved" ? "lime" : "rose";
  const Icon = approval.status === "approved" ? ShieldCheck : ShieldX;
  return (
    <tr className="border-t border-border/40 hover:bg-muted/20">
      <td className="px-3 py-2">
        <span className="font-mono text-[11px] font-semibold text-foreground">
          {approval.action}
        </span>
      </td>
      <td className="px-3 py-2 text-[11px] text-muted-foreground">
        <div className="max-w-[280px] truncate" title={approval.description}>
          {approval.description}
        </div>
      </td>
      <td className="px-3 py-2">
        <pre className="max-h-12 max-w-[200px] overflow-auto rounded border border-border/40 bg-background/60 p-1 text-[10px] leading-relaxed text-muted-foreground/80">
          {JSON.stringify(
            Object.fromEntries(
              Object.entries(approval.args).filter(([k]) => k !== "__approvalId"),
            ),
            null,
            2,
          )}
        </pre>
      </td>
      <td className="px-3 py-2 text-[11px] text-muted-foreground">
        <div className="font-mono">{formatDateTime(approval.requestedAt, locale)}</div>
        <div className="text-[10px] text-muted-foreground/70">{relativeTime(approval.requestedAt, locale)}</div>
      </td>
      <td className="px-3 py-2 text-[11px] text-muted-foreground">
        {approval.decidedAt ? (
          <>
            <div className="font-mono">{formatDateTime(approval.decidedAt, locale)}</div>
            <div className="text-[10px] text-muted-foreground/70">{relativeTime(approval.decidedAt, locale)}</div>
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
        {approval.decidedBy ?? "—"}
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            tone === "lime" && "bg-lime/15 text-lime",
            tone === "rose" && "bg-rose/15 text-rose",
          )}
        >
          <Icon className="h-2.5 w-2.5" />
          {t(`ownerAi.approval.status.${approval.status}`)}
        </span>
      </td>
    </tr>
  );
}
