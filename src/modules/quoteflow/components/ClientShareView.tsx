"use client";

/**
 * ClientShareView — simulated branded client share page.
 * Triggered from QuoteDetail "Open share view".
 *
 * Shows a clean quote preview with Accept/Reject buttons and "expires in X days".
 */

import { useMemo, useState, type ReactNode } from "react";
import { ShieldCheck, Clock, Check, X, Building2 } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  relativeTime,
} from "@/lib/utils";

import {
  mockLeads,
  mockCustomers,
  resolveQuoteParty,
  type MockQuote,
} from "../data";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ClientShareViewProps {
  quote: MockQuote;
  trigger?: ReactNode;
}

export function ClientShareView({ quote, trigger }: ClientShareViewProps) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"accepted" | "rejected" | null>(null);

  const party = useMemo(
    () => resolveQuoteParty(quote, mockLeads, mockCustomers),
    [quote],
  );

  const expiresIn = useMemo(() => {
    const ms = +new Date(quote.validUntil) - Date.now();
    return Math.ceil(ms / 86400000);
  }, [quote.validUntil]);

  const expired = expiresIn <= 0;

  const onAccept = () => {
    setDecision("accepted");
    toast.success(t("quoteflow.clientShare.accepted"));
  };
  const onReject = () => {
    setDecision("rejected");
    toast.error(t("quoteflow.clientShare.rejected"));
  };

  return (
    <>
      {trigger && (
        <span onClick={() => setOpen(true)} className="inline-flex">
          {trigger}
        </span>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDecision(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">{t("quoteflow.clientShare.title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("quoteflow.clientShare.title")}
            </DialogDescription>
          </DialogHeader>

          {/* Branded client view */}
          <div className="rounded-xl border border-border bg-background/60 p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-cyan">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">HayDev HQ</span>
                </div>
                <div className="mt-1 font-mono text-lg font-semibold text-foreground">
                  {quote.number}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {expired ? (
                    <span className="text-rose">{t("quoteflow.clientShare.expired")}</span>
                  ) : (
                    <span>
                      {t("quoteflow.clientShare.expiresIn", { n: expiresIn })}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  {t("quoteflow.clientShare.valid")}: {formatDate(quote.validUntil, locale)}
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Parties */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">{t("quoteflow.clientShare.from")}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  HayDev HQ
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("quoteflow.clientShare.to")}</div>
                <div className="mt-0.5 text-foreground">{party.name}</div>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Items */}
            <div className="overflow-hidden rounded-lg ring-1 ring-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("quoteflow.clientShare.items")}</th>
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
                        <td className="px-3 py-2 text-right font-mono font-medium text-foreground">{formatCurrency(it.total, quote.currency)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-3 ml-auto w-full max-w-[260px] space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("quoteflow.builder.subtotal")}</span>
                <span className="font-mono">{formatCurrency(quote.subtotal, quote.currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("quoteflow.builder.totalDiscount")}</span>
                <span className="font-mono text-amber">− {formatCurrency(quote.discount, quote.currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t("quoteflow.builder.tax")}</span>
                <span className="font-mono">{formatCurrency(quote.tax, quote.currency)}</span>
              </div>
              <Separator className="my-1.5" />
              <div className="flex justify-between text-base font-bold text-lime">
                <span>{t("quoteflow.builder.grandTotal")}</span>
                <span className="font-mono">{formatCurrency(quote.total, quote.currency)}</span>
              </div>
            </div>

            {/* Decision */}
            <Separator className="my-4" />

            {decision === "accepted" ? (
              <div className="rounded-lg border border-lime/30 bg-lime/5 p-4 text-center">
                <Check className="mx-auto h-6 w-6 text-lime" />
                <p className="mt-2 text-sm text-foreground">
                  {t("quoteflow.clientShare.accepted")}
                </p>
              </div>
            ) : decision === "rejected" ? (
              <div className="rounded-lg border border-rose/30 bg-rose/5 p-4 text-center">
                <X className="mx-auto h-6 w-6 text-rose" />
                <p className="mt-2 text-sm text-foreground">
                  {t("quoteflow.clientShare.rejected")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={expired}
                  onClick={onAccept}
                >
                  <Check className="h-4 w-4" />
                  {t("quoteflow.clientShare.accept")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 text-rose hover:text-rose"
                  disabled={expired}
                  onClick={onReject}
                >
                  <X className="h-4 w-4" />
                  {t("quoteflow.clientShare.reject")}
                </Button>
              </div>
            )}

            <div className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("quoteflow.clientShare.poweredBy")}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
