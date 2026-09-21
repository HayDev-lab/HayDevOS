"use client";

/**
 * ApprovalsView — pending approvals queue + history.
 * Each row shows: quote, requested discount/margin/value, threshold, approver, status.
 * Approve / Reject buttons (toast). History section below.
 */

import { useMemo, useState } from "react";
import { ShieldCheck, Check, X, History } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  relativeTime,
  statusColor,
  toneClasses,
} from "@/lib/utils";

import {
  mockApprovals,
  type ApprovalRequest,
  type ApprovalStatus,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

const STATUS_KEY: Record<ApprovalStatus, string> = {
  pending: "quoteflow.approvals.status.pending",
  approved: "quoteflow.approvals.status.approved",
  rejected: "quoteflow.approvals.status.rejected",
};

export function ApprovalsView() {
  const { t, locale } = useLocale();
  const [items, setItems] = useState<ApprovalRequest[]>(mockApprovals);

  const pending = useMemo(() => items.filter((a) => a.status === "pending"), [items]);
  const history = useMemo(
    () =>
      items
        .filter((a) => a.status !== "pending")
        .sort((a, b) => +new Date(b.decidedAt ?? b.requestedAt) - +new Date(a.decidedAt ?? a.requestedAt)),
    [items],
  );

  const decide = (id: string, status: "approved" | "rejected") => {
    setItems((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              decidedAt: new Date().toISOString(),
              reason: status === "approved" ? "Approved from queue." : "Rejected from queue.",
            }
          : a,
      ),
    );
    if (status === "approved") toast.success(t("quoteflow.approvals.approvedToast"));
    else toast.error(t("quoteflow.approvals.rejectedToast"));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-cyan" />
          {t("quoteflow.approvals.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("quoteflow.approvals.subtitle")}</p>
      </div>

      {/* Pending queue */}
      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-amber/10 text-amber ring-1 ring-amber/30">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              </span>
              {t("quoteflow.approvals.status.pending")}
              <Badge variant="secondary">{pending.length}</Badge>
            </div>
          </div>

          {pending.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {t("quoteflow.approvals.empty")}
            </div>
          ) : (
            <div className="max-h-[440px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>{t("quoteflow.approvals.quote")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("quoteflow.approvals.threshold")}</TableHead>
                    <TableHead className="text-right">{t("quoteflow.approvals.discount")}</TableHead>
                    <TableHead className="text-right">{t("quoteflow.approvals.margin")}</TableHead>
                    <TableHead className="text-right">{t("quoteflow.approvals.value")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("quoteflow.approvals.approver")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("quoteflow.approvals.requested")}</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-mono font-medium text-foreground">{a.quoteNumber}</div>
                        <div className="text-xs text-muted-foreground">{a.customerName}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        <code className="rounded bg-muted/40 px-1.5 py-0.5">{a.threshold}</code>
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber">
                        {a.discountPct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-cyan">
                        {a.marginPct.toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(a.totalValue, a.currency)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {a.approverName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {relativeTime(a.requestedAt, locale)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-lime hover:text-lime"
                            onClick={() => decide(a.id, "approved")}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{t("quoteflow.approvals.approve")}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-rose hover:text-rose"
                            onClick={() => decide(a.id, "rejected")}
                          >
                            <X className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{t("quoteflow.approvals.reject")}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* History */}
      <Card className="surface-elevated">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <History className="h-4 w-4 text-muted-foreground" />
              {t("quoteflow.approvals.history")}
              <Badge variant="secondary">{history.length}</Badge>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {t("quoteflow.approvals.empty")}
            </div>
          ) : (
            <div className="max-h-[440px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>{t("quoteflow.approvals.quote")}</TableHead>
                    <TableHead>{t("quoteflow.approvals.status")}</TableHead>
                    <TableHead className="text-right">{t("quoteflow.approvals.value")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("quoteflow.approvals.approver")}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t("quoteflow.approvals.requested")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((a) => {
                    const tone = statusColor(a.status);
                    const cls = toneClasses(tone);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-mono font-medium text-foreground">{a.quoteNumber}</div>
                          <div className="text-xs text-muted-foreground">{a.customerName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(cls.text, cls.bg, cls.border, "gap-1")}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
                            {t(STATUS_KEY[a.status])}
                          </Badge>
                          {a.reason && (
                            <div className="mt-1 max-w-[240px] truncate text-xs italic text-muted-foreground">
                              “{a.reason}”
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(a.totalValue, a.currency)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {a.approverName}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {formatDate(a.decidedAt ?? a.requestedAt, locale)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
