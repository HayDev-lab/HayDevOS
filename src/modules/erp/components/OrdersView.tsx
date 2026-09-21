"use client";

/**
 * OrdersView — sales orders table with New Order dialog + OrderDetail drawer.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
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
  erpOrders,
  erpCustomers,
  erpProducts,
  erpInvoices,
  customerName,
  customerById,
  productById,
  type ErpOrder,
  type ErpOrderLineItem,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, ErpEmptyState, ErpSectionHeader } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Order detail drawer
// ─────────────────────────────────────────────────────────────────────────────

function OrderDetail({
  order,
  open,
  onOpenChange,
}: {
  order: ErpOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useLocale();
  if (!order) return null;

  const customer = customerById(order.customerId);
  const linkedInvoice = erpInvoices.find((i) => i.orderId === order.id);
  const subtotal = order.items.reduce((s, li) => s + li.total, 0);
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + tax;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4 text-cyan" />
            {order.number}
            <StatusBadge status={order.status} label={t(`erp.order.status.${order.status}` as const)} />
          </SheetTitle>
          <SheetDescription>
            {customer?.name ?? "—"} · {formatDate(order.createdAt, locale)}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 p-5">
            {/* Customer + fulfillment summary */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("erp.order.customer")}
                </p>
                <p className="text-sm font-medium text-foreground">{customer?.name ?? "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{customer?.email ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-border bg-card/40 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("erp.order.fulfillment")}
                </p>
                <p className="text-sm font-medium text-foreground">{order.fulfillment.method}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.fulfillment.carrier}
                  {order.fulfillment.tracking ? ` · ${order.fulfillment.tracking}` : ""}
                </p>
              </div>
            </div>

            {/* Line items */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("erp.order.items.section")}
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
                    {order.items.map((li) => (
                      <TableRow key={li.id}>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{li.name}</p>
                          <p className="text-xs text-muted-foreground">{li.sku}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm">{li.qty}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(li.unitPrice)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(li.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-3 ml-auto w-full max-w-[260px] space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("erp.order.subtotal")}</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("erp.order.tax")} (10%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold text-foreground">
                  <span>{t("erp.order.grandTotal")}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </section>

            {/* Linked invoice */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("erp.order.linkedInvoice")}
              </h3>
              {linkedInvoice ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{linkedInvoice.number}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(linkedInvoice.amount)}</p>
                  </div>
                  <StatusBadge status={linkedInvoice.status} label={t(`erp.invoice.status.${linkedInvoice.status}` as const)} />
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-card/20 p-3 text-sm text-muted-foreground">
                  —
                </p>
              )}
            </section>

            {/* Timeline */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("erp.order.timeline")}
              </h3>
              <ol className="space-y-2">
                {order.timeline.map((ev) => {
                  const cls = toneClasses(ev.tone);
                  return (
                    <li key={ev.id} className="flex items-start gap-2.5">
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", cls.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{ev.label}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(ev.ts, locale)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {order.notes ? (
              <p className="rounded-lg border border-border bg-card/40 p-3 text-sm text-muted-foreground">
                {order.notes}
              </p>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// New order dialog
// ─────────────────────────────────────────────────────────────────────────────

interface DraftLine {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
}

function NewOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const [customerId, setCustomerId] = useState<string>("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + tax;

  const addLine = () => {
    const p = erpProducts[0];
    setLines((prev) => [
      ...prev,
      { id: `dl_${Date.now()}_${prev.length}`, productId: p.id, qty: 1, unitPrice: p.price },
    ]);
  };

  const updateLine = (id: string, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.productId) {
          const p = productById(patch.productId);
          if (p) next.unitPrice = p.price;
        }
        return next;
      }),
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleCreate = () => {
    if (!customerId) {
      toast.error(t("erp.order.selectCustomer"));
      return;
    }
    if (lines.length === 0) {
      toast.error(t("erp.order.emptyItems"));
      return;
    }
    const customer = customerById(customerId);
    const nextNum = `SO-2026-${String(101 + Math.floor(Math.random() * 900)).padStart(4, "0")}`;
    toast.success(t("erp.toast.orderCreated", { number: nextNum }));
    // Reset & close
    setCustomerId("");
    setLines([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-lime" />
            {t("erp.order.new")}
          </DialogTitle>
          <DialogDescription>{t("erp.order.title")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label>{t("erp.order.customer")}</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("erp.order.selectCustomer")} />
              </SelectTrigger>
              <SelectContent>
                {erpCustomers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("erp.order.items.section")}</Label>
              <Button size="sm" variant="outline" onClick={addLine} type="button">
                <Plus className="h-3.5 w-3.5" />
                {t("erp.order.addLine")}
              </Button>
            </div>

            <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-lg border border-border p-2">
              {lines.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  {t("erp.order.emptyItems")}
                </div>
              ) : (
                lines.map((l) => (
                  <div key={l.id} className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-6">
                      <Select value={l.productId} onValueChange={(v) => updateLine(l.id, { productId: v })}>
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {erpProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) => updateLine(l.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                      className="col-span-2 h-8"
                    />
                    <div className="col-span-3 text-right text-sm font-medium text-foreground">
                      {formatCurrency(l.qty * l.unitPrice)}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      type="button"
                      className="col-span-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(l.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="ml-auto w-full max-w-[260px] space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{t("erp.order.subtotal")}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t("erp.order.tax")} (10%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold text-foreground">
              <span>{t("erp.order.grandTotal")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            {t("erp.order.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status icon helper
// ─────────────────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (["delivered", "confirmed"].includes(s)) return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (["shipped", "processing"].includes(s)) return <Truck className="h-3.5 w-3.5" />;
  if (["pending", "draft"].includes(s)) return <Clock className="h-3.5 w-3.5" />;
  if (["cancelled"].includes(s)) return <X className="h-3.5 w-3.5" />;
  return <Package className="h-3.5 w-3.5" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// OrdersView
// ─────────────────────────────────────────────────────────────────────────────

export function OrdersView() {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ErpOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(() => {
    return erpOrders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${o.number} ${customerName(o.customerId)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [search, statusFilter]);

  return (
    <div className="space-y-4">
      <ErpSectionHeader
        icon={ShoppingBag}
        title={t("erp.order.title")}
        subtitle={`${filtered.length} / ${erpOrders.length}`}
        right={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("erp.order.new")}
          </Button>
        }
      />

      <Card className="surface-elevated">
        <CardContent className="gap-0 p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("erp.order.search")}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder={t("erp.invoice.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="draft">{t("erp.order.status.draft")}</SelectItem>
                <SelectItem value="confirmed">{t("erp.order.status.confirmed")}</SelectItem>
                <SelectItem value="processing">{t("erp.order.status.processing")}</SelectItem>
                <SelectItem value="shipped">{t("erp.order.status.shipped")}</SelectItem>
                <SelectItem value="delivered">{t("erp.order.status.delivered")}</SelectItem>
                <SelectItem value="cancelled">{t("erp.order.status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("erp.order.number")}</TableHead>
                  <TableHead>{t("erp.order.customer")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("erp.order.date")}</TableHead>
                  <TableHead className="text-right">{t("erp.order.items")}</TableHead>
                  <TableHead className="text-right">{t("erp.order.total")}</TableHead>
                  <TableHead>{t("erp.order.status")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}><ErpEmptyState /></TableCell>
                  </TableRow>
                ) : (
                  filtered.map((o) => {
                    const total = o.items.reduce((s, li) => s + li.total, 0);
                    return (
                      <TableRow
                        key={o.id}
                        onClick={() => { setSelected(o); setOpen(true); }}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">{o.number}</TableCell>
                        <TableCell className="text-sm text-foreground">{customerName(o.customerId)}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {formatDate(o.createdAt, locale)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{o.items.length}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">{formatCurrency(total, o.currency)}</TableCell>
                        <TableCell>
                          <StatusBadge status={o.status} label={t(`erp.order.status.${o.status}` as const)} />
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

      <OrderDetail order={selected} open={open} onOpenChange={setOpen} />
      <NewOrderDialog open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

export default OrdersView;
