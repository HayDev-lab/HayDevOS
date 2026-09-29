"use client";

/**
 * PaymentsView — payments received table + Record Payment dialog + method
 * breakdown chart.
 */

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  CreditCard,
  Wallet,
  Banknote,
  Bitcoin,
  Building2,
  Plus,
  Receipt,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  formatCompact,
} from "@/lib/utils";
import { toast } from "sonner";

import {
  erpPayments,
  erpInvoices,
  customerName,
  invoiceById,
  type PaymentMethod,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  AiProtectedBadge,
  ErpEmptyState,
  ErpSectionHeader,
  HighRiskConfirm,
} from "./shared";

const METHOD_COLORS: Record<PaymentMethod, string> = {
  card: "var(--accent-cyan)",
  bank: "var(--accent-lime)",
  cash: "var(--accent-amber)",
  crypto: "var(--accent-violet)",
  wallet: "var(--accent-rose)",
};

const METHOD_ICONS: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  card: CreditCard,
  bank: Building2,
  cash: Banknote,
  crypto: Bitcoin,
  wallet: Wallet,
};

// ─────────────────────────────────────────────────────────────────────────────
// Record payment dialog
// ─────────────────────────────────────────────────────────────────────────────

function RecordPaymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [reference, setReference] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const invoice = invoiceId ? invoiceById(invoiceId) : undefined;
  const effectiveAmount = amount || (invoice ? Math.max(0, invoice.amount - invoice.paidAmount) : 0);

  const handleApply = () => {
    if (!invoice) {
      toast.error(t("erp.payment.invoiceSelect"));
      return;
    }
    if (effectiveAmount <= 0) {
      toast.error(t("erp.payment.amountEnter"));
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (invoice) {
      toast.success(t("erp.toast.paymentRecorded", { number: invoice.number }));
    }
    setInvoiceId("");
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
              <Plus className="h-4 w-4 text-lime" />
              {t("erp.payment.record")}
            </DialogTitle>
            <DialogDescription>{t("erp.payment.title")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("erp.payment.invoiceSelect")}</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger className="w-full"><SelectValue placeholder={t("erp.payment.invoiceSelect")} /></SelectTrigger>
                <SelectContent>
                  {erpInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.number} · {customerName(i.customerId)} · {formatCurrency(i.amount - i.paidAmount, i.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("erp.payment.amount")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount || ""}
                  placeholder={invoice ? (invoice.amount - invoice.paidAmount).toFixed(2) : "0.00"}
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
              {t("erp.payment.record")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HighRiskConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        actionLabel={invoice ? `${t("erp.payment.record")}: ${invoice.number} · ${formatCurrency(effectiveAmount, invoice.currency)} (${method})` : ""}
        details={
          <div className="space-y-1">
            {invoice ? (
              <>
                <div>{t("erp.payment.invoice")}: <span className="font-mono">{invoice.number}</span></div>
                <div>{t("erp.payment.customer")}: <span className="font-mono">{customerName(invoice.customerId)}</span></div>
                <div>{t("erp.payment.amount")}: <span className="font-mono">{formatCurrency(effectiveAmount, invoice.currency)}</span></div>
                <div>{t("erp.payment.method")}: <span className="font-mono">{method}</span></div>
                <div>{t("erp.payment.reference")}: <span className="font-mono">{reference || "—"}</span></div>
              </>
            ) : null}
          </div>
        }
        tone="primary"
        onConfirm={handleConfirm}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PaymentsView
// ─────────────────────────────────────────────────────────────────────────────

export function PaymentsView() {
  const { t, locale } = useLocale();
  const [recordOpen, setRecordOpen] = useState(false);

  const sorted = useMemo(
    () => [...erpPayments].sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt)),
    [],
  );

  const totalReceived = useMemo(
    () => erpPayments.reduce((s, p) => s + (p.currency === "USD" ? p.amount : p.amount * 1.08), 0),
    [],
  );

  // Method breakdown
  const breakdown = useMemo(() => {
    const map = new Map<PaymentMethod, number>();
    for (const p of erpPayments) {
      const cur = map.get(p.method) ?? 0;
      const usd = p.currency === "USD" ? p.amount : p.amount * 1.08;
      map.set(p.method, cur + usd);
    }
    return Array.from(map.entries()).map(([method, value]) => ({
      method,
      name: t(`erp.payment.method.${method}` as const),
      value: Math.round(value),
    }));
  }, [t]);

  return (
    <div className="space-y-4">
      <ErpSectionHeader
        icon={CreditCard}
        title={t("erp.payment.title")}
        subtitle={`${erpPayments.length} payments · ${formatCurrency(totalReceived)} total`}
        right={
          <div className="flex items-center gap-2">
            <AiProtectedBadge withTooltip />
            <Button size="sm" onClick={() => setRecordOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("erp.payment.record")}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Table */}
        <Card className="surface-elevated lg:col-span-2">
          <CardContent className="gap-0 p-0">
            <div className="max-h-[640px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t("erp.payment.date")}</TableHead>
                    <TableHead>{t("erp.payment.invoice")}</TableHead>
                    <TableHead>{t("erp.payment.customer")}</TableHead>
                    <TableHead>{t("erp.payment.method")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("erp.payment.reference")}</TableHead>
                    <TableHead className="text-right">{t("erp.payment.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}><ErpEmptyState /></TableCell>
                    </TableRow>
                  ) : (
                    sorted.map((p) => {
                      const inv = invoiceById(p.invoiceId);
                      const Icon = METHOD_ICONS[p.method];
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(p.paidAt, locale)}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-medium text-foreground">
                              {inv?.number ?? p.invoiceId}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{customerName(p.customerId)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="gap-1 border-border bg-muted text-[10px] uppercase tracking-wider"
                              style={{ color: METHOD_COLORS[p.method], borderColor: `color-mix(in oklab, ${METHOD_COLORS[p.method]} 35%, transparent)` }}
                            >
                              <Icon className="h-3 w-3" />
                              {t(`erp.payment.method.${p.method}` as const)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{p.reference}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-success">
                            +{formatCurrency(p.amount, p.currency)}
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

        {/* Method breakdown chart */}
        <Card className="surface-elevated">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-cyan" />
                <h2 className="text-sm font-semibold text-foreground">{t("erp.payment.breakdown")}</h2>
              </div>
            </div>
            <div className="h-[300px] w-full p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {breakdown.map((entry) => (
                      <Cell key={entry.method} fill={METHOD_COLORS[entry.method]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <RecordPaymentDialog open={recordOpen} onOpenChange={setRecordOpen} />
    </div>
  );
}

export default PaymentsView;
