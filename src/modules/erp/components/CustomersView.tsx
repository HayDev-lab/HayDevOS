"use client";

/**
 * CustomersView — customer table with search + type filter, row click opens
 * CustomerDetail sheet (profile, order/invoice/payment history, credit limit).
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Users,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  StickyNote,
  Receipt,
  ShoppingBag,
  Wallet,
  ArrowRight,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  formatCompact,
  initials,
  toneClasses,
  statusColor,
} from "@/lib/utils";
import { toast } from "sonner";

import {
  erpCustomers,
  erpOrders,
  erpInvoices,
  erpPayments,
  ordersForCustomer,
  invoicesForCustomer,
  paymentsForCustomer,
  type ErpCustomer,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge, ErpEmptyState, ErpSectionHeader } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Customer detail drawer
// ─────────────────────────────────────────────────────────────────────────────

function CustomerDetail({
  customer,
  open,
  onOpenChange,
}: {
  customer: ErpCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useLocale();
  if (!customer) return null;

  const orders = ordersForCustomer(customer.id);
  const invoices = invoicesForCustomer(customer.id);
  const payments = paymentsForCustomer(customer.id);
  const available = Math.max(0, customer.creditLimit - customer.outstandingBalance);
  const usedPct = customer.creditLimit > 0 ? Math.min(100, (customer.outstandingBalance / customer.creditLimit) * 100) : 0;
  const usedTone = usedPct > 90 ? "destructive" : usedPct > 60 ? "warning" : "success";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full flex flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="border-b border-border p-5 pr-12">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold",
                customer.status === "active"
                  ? "border-success/30 bg-success/10 text-success"
                  : customer.status === "blocked"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-cyan/30 bg-cyan/10 text-cyan",
              )}
            >
              {initials(customer.name)}
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">{customer.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="border-border bg-muted text-xs">
                  {customer.type === "business" ? (
                    <Building2 className="h-3 w-3" />
                  ) : (
                    <User className="h-3 w-3" />
                  )}
                  {t(`erp.customer.type.${customer.type}`)}
                </Badge>
                <StatusBadge status={customer.status} label={customer.status} />
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 p-5">
            {/* Contact */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("erp.customer.profile")}
              </h3>
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card/40 p-4 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{customer.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{customer.phone ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{customer.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{customer.vatId ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t("erp.customer.since")}: {formatDate(customer.createdAt, locale)}</span>
                </div>
              </div>
            </section>

            {/* Credit limit */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("erp.customer.creditLimit")}
              </h3>
              <div className="rounded-lg border border-border bg-card/40 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("erp.customer.used")}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(customer.outstandingBalance)} / {formatCurrency(customer.creditLimit)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usedPct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      usedTone === "destructive"
                        ? "bg-destructive"
                        : usedTone === "warning"
                          ? "bg-warning"
                          : "bg-success",
                    )}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("erp.customer.available")}: {formatCurrency(available)}</span>
                  <span>{usedPct.toFixed(0)}% used</span>
                </div>
              </div>
            </section>

            {/* Order history */}
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShoppingBag className="h-3.5 w-3.5" />
                {t("erp.customer.orderHistory")} ({orders.length})
              </h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("erp.order.number")}</TableHead>
                      <TableHead>{t("erp.order.date")}</TableHead>
                      <TableHead className="text-right">{t("erp.order.total")}</TableHead>
                      <TableHead>{t("erp.order.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}><ErpEmptyState /></TableCell>
                      </TableRow>
                    ) : (
                      orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">{o.number}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(o.createdAt, locale)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(o.total, o.currency)}</TableCell>
                          <TableCell><StatusBadge status={o.status} label={t(`erp.order.status.${o.status}` as const)} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* Invoice history */}
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" />
                {t("erp.customer.invoiceHistory")} ({invoices.length})
              </h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("erp.invoice.number")}</TableHead>
                      <TableHead>{t("erp.invoice.dueDate")}</TableHead>
                      <TableHead className="text-right">{t("erp.invoice.balance")}</TableHead>
                      <TableHead>{t("erp.invoice.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}><ErpEmptyState /></TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.number}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(inv.dueAt, locale)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Math.max(0, inv.amount - inv.paidAmount), inv.currency)}</TableCell>
                          <TableCell><StatusBadge status={inv.status} label={t(`erp.invoice.status.${inv.status}` as const)} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* Payment history */}
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
                {t("erp.customer.paymentHistory")} ({payments.length})
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
                      <TableRow>
                        <TableCell colSpan={4}><ErpEmptyState /></TableCell>
                      </TableRow>
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

            {/* Notes */}
            {customer.notes ? (
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <StickyNote className="h-3.5 w-3.5" />
                  {t("erp.customer.notes")}
                </h3>
                <p className="rounded-lg border border-border bg-card/40 p-3 text-sm text-muted-foreground">
                  {customer.notes}
                </p>
              </section>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customers view
// ─────────────────────────────────────────────────────────────────────────────

export function CustomersView() {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "individual" | "business">("all");
  const [selected, setSelected] = useState<ErpCustomer | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return erpCustomers.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${c.name} ${c.email ?? ""} ${c.phone ?? ""} ${c.vatId ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, typeFilter]);

  const handleRowClick = (c: ErpCustomer) => {
    setSelected(c);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <ErpSectionHeader
        icon={Users}
        title={t("erp.customer.title")}
        subtitle={`${filtered.length} / ${erpCustomers.length}`}
        right={
          <Button
            size="sm"
            onClick={() => toast.success(t("erp.toast.customerCreated"))}
          >
            <Plus className="h-4 w-4" />
            {t("erp.customer.new")}
          </Button>
        }
      />

      <Card className="surface-elevated">
        <CardContent className="gap-0 p-0">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("erp.customer.search")}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "individual" | "business")}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder={t("erp.customer.filterType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="business">{t("erp.customer.type.business")}</SelectItem>
                <SelectItem value="individual">{t("erp.customer.type.individual")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("erp.customer.name")}</TableHead>
                  <TableHead>{t("erp.customer.type")}</TableHead>
                  <TableHead>{t("erp.customer.email")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("erp.customer.phone")}</TableHead>
                  <TableHead className="text-right">{t("erp.customer.orders")}</TableHead>
                  <TableHead className="text-right">{t("erp.customer.revenue")}</TableHead>
                  <TableHead className="text-right">{t("erp.customer.balance")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}><ErpEmptyState /></TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const balTone = c.outstandingBalance > c.creditLimit ? "destructive" : c.outstandingBalance > 0 ? "warning" : "success";
                    const balCls = toneClasses(balTone);
                    return (
                      <TableRow
                        key={c.id}
                        onClick={() => handleRowClick(c)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-semibold",
                                c.type === "business"
                                  ? "border-cyan/30 bg-cyan/10 text-cyan"
                                  : "border-violet/30 bg-violet/10 text-violet",
                              )}
                            >
                              {initials(c.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{c.country}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border bg-muted text-[10px] uppercase tracking-wider">
                            {c.type === "business" ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {t(`erp.customer.type.${c.type}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.email ?? "—"}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{c.phone ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{c.orderCount}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatCurrency(c.totalSpent)}</TableCell>
                        <TableCell className={cn("text-right text-sm font-medium", balCls.text)}>
                          {formatCurrency(c.outstandingBalance)}
                        </TableCell>
                        <TableCell><StatusBadge status={c.status} label={c.status} /></TableCell>
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

      <CustomerDetail customer={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}

export default CustomersView;
