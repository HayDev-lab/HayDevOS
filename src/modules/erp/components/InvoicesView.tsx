"use client";

/**
 * InvoicesView — invoices table with filters + InvoiceDetail drawer with
 * high-risk financial actions (Record Payment, Send, Cancel, Refund).
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Receipt,
  Send,
  Ban,
  Undo2,
  Plus,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  toneClasses,
  statusColor,
} from "@/lib/utils";
import { toast } from "sonner";

import {
  erpInvoices,
  erpPayments,
  customerById,
  customerName,
  paymentsForInvoice,
  invoiceAgingBucket,
  invoiceOutstanding,
  type ErpInvoice,
  type ErpPayment,
  type PaymentMethod,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  AiProtectedBadge,
  StatusBadge,
  ErpEmptyState,
  ErpSectionHeader,
  HighRiskConfirm,
} from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Record payment dialog (financial mutation)
// ─────────────────────────────────────────────────────────────────────────────

function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: ErpInvoice | null;
}) {
  const { t } = useLocale();
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [reference, setReference] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const outstanding = invoice ? invoiceOutstanding(invoice) : 0;
  const effectiveAmount = amount || outstanding;

  if (!invoice) return null;

  const handleApply = () => {
    if (effectiveAmount <= 0) {
      toast.error(t("erp.payment.amountEnter"));
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    toast.success(t("erp.toast.paymentRecorded", { number: invoice.number }));
    setAmount(0);
    setReference("");
    setMethod("bank");
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-lime" />
              {t("erp.invoice.recordPayment")}
            </DialogTitle>
            <DialogDescription>
              {invoice.number} · {customerName(invoice.customerId)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("erp.invoice.amount")}</span>
                <span className="font-medium text-foreground">{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-muted-foreground">
                <span>{t("erp.invoice.paid")}</span>
                <span className="font-medium text-success">{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-foreground">{t("erp.invoice.outstanding")}</span>
                <span className="font-semibold text-amber">{formatCurrency(outstanding, invoice.currency)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("erp.payment.amount")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount || ""}
                  placeholder={outstanding.toFixed(2)}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("erp.payment.method")}</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">{t("erp.payment.method.card")}</SelectItem>
                    <SelectItem value="bank">{t("erp.payment.method.bank")}</SelectItem>
                    <SelectItem value="cash">{t("erp.payment.method.cash")}</SelectItem>
                    <SelectItem value="crypto">{t("erp.payment.method.crypto")}</SelectItem>
                    <SelectItem value="wallet">{t("erp.payment.method.wallet")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("erp.payment.reference")}</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="WIRE-XXX / CARD-XXX"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleApply}>
              <CreditCard className="h-4 w-4" />
              {t("erp.invoice.recordPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HighRiskConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        actionLabel={`${t("erp.invoice.recordPayment")}: ${invoice.number} · ${formatCurrency(effectiveAmount, invoice.currency)} (${method})`}
        details={
          <div className="space-y-1">
            <div>{t("erp.payment.invoice")}: <span className="font-mono">{invoice.number}</span></div>
            <div>{t("erp.payment.customer")}: <span className="font-mono">{customerName(invoice.customerId)}</span></div>
            <div>{t("erp.payment.amount")}: <span className="font-mono">{formatCurrency(effectiveAmount, invoice.currency)}</span></div>
            <div>{t("erp.payment.method")}: <span className="font-mono">{method}</span></div>
            <div>{t("erp.payment.reference")}: <span className="font-mono">{reference || "—"}</span></div>
          </div>
        }
        tone="primary"
        onConfirm={handleConfirm}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice detail drawer
// ─────────────────────────────────────────────────────────────────────────────

function InvoiceDetail({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: ErpInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useLocale();
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  if (!invoice) return null;

  const customer = customerById(invoice.customerId);
  const payments = paymentsForInvoice(invoice.id);
  const outstanding = invoiceOutstanding(invoice);
  const aging = invoiceAgingBucket(invoice);
  const agingLabelKey =
    aging === "current" ? "erp.aging.current" :
    aging === "1_30" ? "erp.aging.1_30" :
    aging === "31_60" ? "erp.aging.31_60" :
    "erp.aging.60plus";
  const agingTone =
    aging === "current" ? "success" :
    aging === "1_30" ? "warning" :
    aging === "31_60" ? "warning" :
    "destructive";
  const agingCls = toneClasses(agingTone);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl">
          <SheetHeader className="border-b border-border p-5 pr-12">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-cyan" />
              {invoice.number}
              <StatusBadge status={invoice.status} label={t(`erp.invoice.status.${invoice.status}` as const)} />
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <span>{customer?.name ?? "—"}</span>
              <Badge variant="outline" className={cn("gap-1 px-1.5 py-0 text-[10px] uppercase tracking-wider", agingCls.border, agingCls.bg, agingCls.text)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", agingCls.dot)} />
                {t("erp.invoice.aging")}: {t(agingLabelKey)}
              </Badge>
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
            <Button size="sm" onClick={() => setPayOpen(true)} disabled={outstanding <= 0}>
              <CreditCard className="h-3.5 w-3.5" />
              {t("erp.invoice.recordPayment")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => toast.success(t("erp.toast.invoiceSent", { number: invoice.number }))}>
              <Send className="h-3.5 w-3.5" />
              {t("erp.invoice.send")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
              <Ban className="h-3.5 w-3.5" />
              {t("erp.invoice.cancel")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRefundOpen(true)} disabled={invoice.paidAmount <= 0}>
              <Undo2 className="h-3.5 w-3.5" />
              {t("erp.invoice.refund")}
            </Button>
            <div className="ml-auto"><AiProtectedBadge withTooltip /></div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-5 p-5">
              {/* Summary grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("erp.invoice.issueDate")}</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{formatDate(invoice.issueDate, locale)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("erp.invoice.dueDate")}</p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">{formatDate(invoice.dueAt, locale)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("erp.invoice.paidAmount")}</p>
                  <p className="mt-0.5 text-sm font-medium text-success">{formatCurrency(invoice.paidAmount, invoice.currency)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("erp.invoice.outstanding")}</p>
                  <p className="mt-0.5 text-sm font-medium text-amber">{formatCurrency(outstanding, invoice.currency)}</p>
                </div>
              </div>

              {/* Line items */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("erp.invoice.lineItems")}
                </h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("erp.order.product")}</TableHead>
                        <TableHead className="text-right">{t("erp.order.qty")}</TableHead>
                        <TableHead className="text-right">{t("erp.order.unitPrice")}</TableHead>
                        <TableHead className="text-right">{t("erp.order.lineTotal")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.lineItems.map((li) => (
                        <TableRow key={li.id}>
                          <TableCell className="text-sm">{li.description}</TableCell>
                          <TableCell className="text-right text-sm">{li.qty}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(li.unitPrice, invoice.currency)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(li.total, invoice.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="ml-auto mt-3 w-full max-w-[260px] space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("erp.invoice.subtotal")}</span>
                    <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("erp.invoice.tax")} ({(invoice.taxRate * 100).toFixed(0)}%)</span>
                    <span>{formatCurrency(invoice.tax, invoice.currency)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>{t("erp.invoice.total")}</span>
                    <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
                  </div>
                </div>
              </section>

              {/* Payments */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("erp.invoice.payments")} ({payments.length})
                </h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("erp.payment.date")}</TableHead>
                        <TableHead>{t("erp.payment.method")}</TableHead>
                        <TableHead>{t("erp.payment.reference")}</TableHead>
                        <TableHead className="text-right">{t("erp.payment.amount")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow><TableCell colSpan={4}><ErpEmptyState /></TableCell></TableRow>
                      ) : (
                        payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-muted-foreground">{formatDate(p.paidAt, locale)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-border bg-muted text-xs">
                                {t(`erp.payment.method.${p.method}` as const)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{p.reference}</TableCell>
                            <TableCell className="text-right font-medium text-success">{formatCurrency(p.amount, p.currency)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* Timeline */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("erp.invoice.timeline")}
                </h3>
                <ol className="space-y-2">
                  {invoice.timeline.map((ev) => {
                    const cls = toneClasses(ev.tone);
                    const Icon =
                      ev.label.toLowerCase().includes("paid") ? CheckCircle2 :
                      ev.label.toLowerCase().includes("sent") ? Send :
                      ev.label.toLowerCase().includes("past due") || ev.label.toLowerCase().includes("overdue") ? AlertTriangle :
                      Clock;
                    return (
                      <li key={ev.id} className="flex items-start gap-2.5">
                        <span className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full", cls.bg, cls.text)}>
                          <Icon className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">{ev.label}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(ev.ts, locale)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {invoice.notes ? (
                <p className="rounded-lg border border-border bg-card/40 p-3 text-sm text-muted-foreground">
                  {invoice.notes}
                </p>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} invoice={invoice} />

      <HighRiskConfirm
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        actionLabel={`${t("erp.invoice.cancel")}: ${invoice.number}`}
        details={
          <div className="space-y-1">
            <div>{t("erp.payment.invoice")}: <span className="font-mono">{invoice.number}</span></div>
            <div>{t("erp.payment.customer")}: <span className="font-mono">{customer?.name ?? "—"}</span></div>
            <div>{t("erp.invoice.total")}: <span className="font-mono">{formatCurrency(invoice.amount, invoice.currency)}</span></div>
            <div>{t("erp.invoice.paid")}: <span className="font-mono">{formatCurrency(invoice.paidAmount, invoice.currency)}</span></div>
          </div>
        }
        tone="destructive"
        onConfirm={() => {
          toast.success(t("erp.toast.invoiceCancelled", { number: invoice.number }));
          onOpenChange(false);
        }}
      />

      <HighRiskConfirm
        open={refundOpen}
        onOpenChange={setRefundOpen}
        actionLabel={`${t("erp.invoice.refund")}: ${invoice.number} · ${formatCurrency(invoice.paidAmount, invoice.currency)}`}
        details={
          <div className="space-y-1">
            <div>{t("erp.payment.invoice")}: <span className="font-mono">{invoice.number}</span></div>
            <div>{t("erp.invoice.refundAmount")}: <span className="font-mono">{formatCurrency(invoice.paidAmount, invoice.currency)}</span></div>
          </div>
        }
        tone="destructive"
        onConfirm={() => {
          toast.success(t("erp.toast.invoiceRefunded", { number: invoice.number }));
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InvoicesView
// ─────────────────────────────────────────────────────────────────────────────

export function InvoicesView() {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ErpInvoice | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return erpInvoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${inv.number} ${customerName(inv.customerId)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [search, statusFilter]);

  return (
    <div className="space-y-4">
      <ErpSectionHeader
        icon={Receipt}
        title={t("erp.invoice.title")}
        subtitle={`${filtered.length} / ${erpInvoices.length}`}
        right={<AiProtectedBadge withTooltip />}
      />

      <Card className="surface-elevated">
        <CardContent className="gap-0 p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("erp.invoice.search")}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder={t("erp.invoice.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="draft">{t("erp.invoice.status.draft")}</SelectItem>
                <SelectItem value="sent">{t("erp.invoice.status.sent")}</SelectItem>
                <SelectItem value="paid">{t("erp.invoice.status.paid")}</SelectItem>
                <SelectItem value="overdue">{t("erp.invoice.status.overdue")}</SelectItem>
                <SelectItem value="cancelled">{t("erp.invoice.status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("erp.invoice.number")}</TableHead>
                  <TableHead>{t("erp.invoice.customer")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("erp.invoice.issueDate")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("erp.invoice.dueDate")}</TableHead>
                  <TableHead className="text-right">{t("erp.invoice.amount")}</TableHead>
                  <TableHead className="text-right">{t("erp.invoice.paid")}</TableHead>
                  <TableHead className="text-right hidden md:table-cell">{t("erp.invoice.balance")}</TableHead>
                  <TableHead>{t("erp.invoice.status")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}><ErpEmptyState /></TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => {
                    const outstanding = invoiceOutstanding(inv);
                    const aging = invoiceAgingBucket(inv);
                    const agingTone =
                      aging === "current" ? "success" :
                      aging === "1_30" ? "warning" :
                      aging === "31_60" ? "warning" :
                      "destructive";
                    const agingCls = toneClasses(agingTone);
                    const isOverdue = inv.status === "overdue";
                    return (
                      <TableRow
                        key={inv.id}
                        onClick={() => { setSelected(inv); setOpen(true); }}
                        className={cn("cursor-pointer", isOverdue && "bg-rose/5 hover:bg-rose/10")}
                      >
                        <TableCell className="font-medium">{inv.number}</TableCell>
                        <TableCell className="text-sm text-foreground">{customerName(inv.customerId)}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {formatDate(inv.issueDate, locale)}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                          {formatDate(inv.dueAt, locale)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                        <TableCell className="text-right text-sm text-success">{formatCurrency(inv.paidAmount, inv.currency)}</TableCell>
                        <TableCell className={cn("hidden text-right text-sm font-medium md:table-cell", agingCls.text)}>
                          {formatCurrency(outstanding, inv.currency)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} label={t(`erp.invoice.status.${inv.status}` as const)} />
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <InvoiceDetail invoice={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}

export default InvoicesView;
