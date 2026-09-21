"use client";

/**
 * QuoteDetail — slide-in drawer (shadcn Sheet, right side, wide).
 *
 * Sections:
 *   - Header (number, customer, status, version)
 *   - Summary (totals, line items)
 *   - Version history (timeline)
 *   - Approvals (status, threshold, approver, decision)
 *   - Generated documents (PDF/DOCX with mock download)
 *   - Client share link (token, expiry, revoke, view count)
 *   - Activity & audit timeline
 *   - Footer actions: Send / Accept / Reject / Revise / Delete + Open share view
 */

import { useMemo } from "react";
import {
  Send,
  Check,
  X,
  GitBranch,
  Trash2,
  Copy,
  ExternalLink,
  Download,
  FileText,
  FileType,
  ShieldCheck,
  Clock,
  Eye,
  History,
  Link2,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  relativeTime,
  statusColor,
  toneClasses,
} from "@/lib/utils";

import {
  mockLeads,
  mockCustomers,
  mockApprovals,
  mockGeneratedDocuments,
  mockShareLinks,
  mockQuoteActivity,
  resolveQuoteParty,
  resolveQuoteOwner,
  type MockQuote,
  type QuoteStatus,
} from "../data";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { ClientShareView } from "./ClientShareView";

const STATUS_KEY: Record<QuoteStatus, string> = {
  draft: "quoteflow.status.draft",
  sent: "quoteflow.status.sent",
  accepted: "quoteflow.status.accepted",
  rejected: "quoteflow.status.rejected",
  expired: "quoteflow.status.expired",
};

const ACTIVITY_ICON: Record<string, typeof Clock> = {
  created: FileText,
  updated: History,
  sent: Send,
  viewed: Eye,
  accepted: Check,
  rejected: X,
  revised: GitBranch,
  approval_requested: ShieldCheck,
  approval_decided: ShieldCheck,
  document_generated: Download,
  share_created: Link2,
  share_revoked: Ban,
  expired: Clock,
};

interface QuoteDetailProps {
  quote: MockQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteDetail({ quote, open, onOpenChange }: QuoteDetailProps) {
  const { t, locale } = useLocale();

  const data = useMemo(() => {
    if (!quote) return null;
    const party = resolveQuoteParty(quote, mockLeads, mockCustomers);
    const owner = resolveQuoteOwner(quote);
    const approvals = mockApprovals.filter((a) => a.quoteId === quote.id);
    const docs = mockGeneratedDocuments.filter((d) => d.quoteId === quote.id);
    const share = mockShareLinks.find((s) => s.quoteId === quote.id) ?? null;
    const activity = mockQuoteActivity
      .filter((a) => a.quoteId === quote.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return { party, owner, approvals, docs, share, activity };
  }, [quote]);

  if (!quote || !data) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{t("quoteflow.detail.title")}</SheetTitle>
            <SheetDescription>—</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const tone = statusColor(quote.status);
  const cls = toneClasses(tone);

  const handleSend = () => toast.success(t("quoteflow.detail.sent"));
  const handleAccept = () => toast.success(t("quoteflow.detail.accepted"));
  const handleReject = () => toast.error(t("quoteflow.detail.rejected"));
  const handleRevise = () =>
    toast.info(t("quoteflow.detail.revised", { n: quote.version + 1 }));
  const handleDelete = () => {
    toast.error(t("quoteflow.detail.deleted"));
    onOpenChange(false);
  };
  const handleRevoke = () => toast.warning(t("quoteflow.detail.revoked"));
  const handleCopyLink = () => {
    if (!data.share) return;
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/q/${data.share.token}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(() => undefined);
    }
    toast.success(t("quoteflow.detail.linkCopied"));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-2xl">
        <SheetHeader className="space-y-2 border-b border-border pr-12">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(cls.text, cls.bg, cls.border, "gap-1")}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", cls.dot)} />
              {t(STATUS_KEY[quote.status])}
            </Badge>
            <Badge variant="secondary" className="font-mono">
              v{quote.version}
            </Badge>
          </div>
          <SheetTitle className="font-mono text-lg">{quote.number}</SheetTitle>
          <SheetDescription className="text-sm">
            {data.party.name} · {data.owner}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {/* Summary */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("quoteflow.detail.summary")}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label={t("quoteflow.builder.subtotal")} value={formatCurrency(quote.subtotal, quote.currency)} />
                <Stat label={t("quoteflow.builder.totalDiscount")} value={`− ${formatCurrency(quote.discount, quote.currency)}`} tone="amber" />
                <Stat label={t("quoteflow.builder.tax")} value={formatCurrency(quote.tax, quote.currency)} />
                <Stat label={t("quoteflow.builder.grandTotal")} value={formatCurrency(quote.total, quote.currency)} tone="lime" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label={t("quoteflow.quotes.currency")} value={quote.currency} />
                <Stat label={t("quoteflow.quotes.validUntil")} value={formatDate(quote.validUntil, locale)} />
                <Stat label={t("quoteflow.quotes.created")} value={formatDate(quote.createdAt, locale)} />
              </div>

              {/* Line items */}
              <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">{t("quoteflow.builder.product")}</th>
                      <th className="px-3 py-2 text-right">{t("quoteflow.builder.qty")}</th>
                      <th className="px-3 py-2 text-right">{t("quoteflow.builder.unitPrice")}</th>
                      <th className="px-3 py-2 text-right">{t("quoteflow.builder.lineTotal")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .map((it) => (
                        <tr key={it.id} className="border-t border-border">
                          <td className="px-3 py-2 text-foreground">{it.productName}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{it.qty}</td>
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">{formatCurrency(it.unitPrice, quote.currency)}</td>
                          <td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(it.total, quote.currency)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            <Separator />

            {/* Versions */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                {t("quoteflow.detail.versions")}
              </h3>
              {quote.version === 1 && quote.parentId === null ? (
                <p className="text-sm text-muted-foreground">{t("quoteflow.detail.noVersions")}</p>
              ) : (
                <ol className="space-y-2">
                  {Array.from({ length: quote.version }, (_, i) => i + 1).map((v) => (
                    <li
                      key={v}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                        v === quote.version
                          ? "border-cyan/30 bg-cyan/5 text-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      <Badge variant="outline" className="font-mono">v{v}</Badge>
                      <span className="flex-1">
                        {v === quote.version
                          ? `${t("quoteflow.detail.summary")} — ${formatDate(quote.createdAt, locale)}`
                          : `${t("quoteflow.detail.revise", { n: v })}`}
                      </span>
                      {v === quote.version && (
                        <Badge className="bg-cyan/10 text-cyan border-cyan/30" variant="outline">
                          current
                        </Badge>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <Separator />

            {/* Approvals */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("quoteflow.detail.approvals")}
              </h3>
              {data.approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("quoteflow.detail.noApprovals")}</p>
              ) : (
                <ul className="space-y-2">
                  {data.approvals.map((a) => {
                    const aTone = statusColor(a.status);
                    const aCls = toneClasses(aTone);
                    return (
                      <li
                        key={a.id}
                        className="rounded-lg border border-border p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn(aCls.text, aCls.bg, aCls.border, "gap-1")}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", aCls.dot)} />
                              {t(`quoteflow.approvals.status.${a.status}` as const)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{a.threshold}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {relativeTime(a.requestedAt, locale)}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <span>
                            <span className="text-muted-foreground">{t("quoteflow.approvals.discount")}: </span>
                            <span className="font-medium text-foreground">{a.discountPct.toFixed(1)}%</span>
                          </span>
                          <span>
                            <span className="text-muted-foreground">{t("quoteflow.approvals.margin")}: </span>
                            <span className="font-medium text-foreground">{a.marginPct.toFixed(0)}%</span>
                          </span>
                          <span>
                            <span className="text-muted-foreground">{t("quoteflow.approvals.approver")}: </span>
                            <span className="font-medium text-foreground">{a.approverName}</span>
                          </span>
                        </div>
                        {a.reason && (
                          <p className="mt-2 text-xs italic text-muted-foreground">“{a.reason}”</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <Separator />

            {/* Generated documents */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Download className="h-3.5 w-3.5" />
                {t("quoteflow.detail.documents")}
              </h3>
              {data.docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("quoteflow.detail.noDocuments")}</p>
              ) : (
                <ul className="space-y-2">
                  {data.docs.map((d) => {
                    const Icon = d.kind === "pdf" ? FileText : FileType;
                    return (
                      <li
                        key={d.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
                      >
                        <div
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-md ring-1",
                            d.kind === "pdf"
                              ? "bg-rose/10 text-rose ring-rose/30"
                              : "bg-cyan/10 text-cyan ring-cyan/30",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {quote.number}.{d.kind}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {d.templateName} · {d.sizeKb} KB · {formatDateTime(d.generatedAt, locale)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-cyan hover:text-cyan"
                          onClick={() =>
                            toast.success(`${d.kind.toUpperCase()} ${t("quoteflow.detail.download").toLowerCase()} — ${quote.number}.${d.kind}`)
                          }
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("quoteflow.detail.download")}</span>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <Separator />

            {/* Client share link */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                {t("quoteflow.detail.share")}
              </h3>
              {!data.share ? (
                <p className="text-sm text-muted-foreground">{t("quoteflow.detail.noDocuments")}</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          {t("quoteflow.detail.shareToken")}
                        </div>
                        <code className="mt-1 block font-mono text-foreground">
                          {data.share.token}
                        </code>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          {t("quoteflow.detail.views")}
                        </div>
                        <div className="mt-1 flex items-center gap-1 font-medium text-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          {data.share.viewCount}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {t("quoteflow.detail.shareExpiry")}: {formatDateTime(data.share.expiresAt, locale)}
                      </span>
                      {data.share.revokedAt && (
                        <Badge variant="outline" className="text-rose border-rose/30 bg-rose/10 gap-1">
                          <Ban className="h-3 w-3" />
                          revoked
                        </Badge>
                      )}
                    </div>
                    {data.share.lastViewedAt && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        last viewed {relativeTime(data.share.lastViewedAt, locale)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleCopyLink}
                      disabled={Boolean(data.share.revokedAt)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {t("quoteflow.detail.copyLink")}
                    </Button>
                    <ClientShareView
                      quote={quote}
                      trigger={
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={Boolean(data.share.revokedAt)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {t("quoteflow.detail.openShare")}
                        </Button>
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto gap-1.5 text-rose hover:text-rose"
                      onClick={handleRevoke}
                      disabled={Boolean(data.share.revokedAt)}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {t("quoteflow.detail.revoke")}
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <Separator />

            {/* Activity & audit timeline */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                {t("quoteflow.detail.activity")}
              </h3>
              {data.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("quoteflow.detail.noActivity")}</p>
              ) : (
                <ol className="relative space-y-3 border-l border-border pl-4">
                  {data.activity.map((a) => {
                    const Icon = ACTIVITY_ICON[a.type] ?? Clock;
                    return (
                      <li key={a.id} className="relative">
                        <span className="absolute -left-[22px] top-1 grid h-4 w-4 place-items-center rounded-full bg-card ring-1 ring-border">
                          <Icon className="h-2.5 w-2.5 text-cyan" />
                        </span>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm text-foreground">{a.message}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {relativeTime(a.createdAt, locale)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.actorName} · {formatDateTime(a.createdAt, locale)}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="border-t border-border p-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSend}>
              <Send className="h-3.5 w-3.5" />
              {t("quoteflow.detail.send")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-lime hover:text-lime" onClick={handleAccept}>
              <Check className="h-3.5 w-3.5" />
              {t("quoteflow.detail.accept")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-rose hover:text-rose" onClick={handleReject}>
              <X className="h-3.5 w-3.5" />
              {t("quoteflow.detail.reject")}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-cyan hover:text-cyan" onClick={handleRevise}>
              <GitBranch className="h-3.5 w-3.5" />
              {t("quoteflow.detail.revise")}
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto gap-1.5 text-rose hover:text-rose" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("quoteflow.detail.delete")}</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "lime" | "cyan" | "amber" | "rose";
}) {
  const toneText =
    tone === "lime"
      ? "text-lime"
      : tone === "cyan"
        ? "text-cyan"
        : tone === "amber"
          ? "text-amber"
          : tone === "rose"
            ? "text-rose"
            : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 font-mono text-sm font-semibold", toneText)}>
        {value}
      </div>
    </div>
  );
}
