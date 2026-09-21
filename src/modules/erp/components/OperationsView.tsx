"use client";

/**
 * OperationsView — operations board: fulfillment pipeline (to ship / shipping /
 * delivered), procurement queue (low-stock → suggested POs), tasks.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Truck,
  Package,
  CheckCircle2,
  ClipboardList,
  ShoppingCart,
  Plus,
  PackageX,
  AlertTriangle,
  Clock,
  Loader2,
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
  erpTasks,
  erpSuppliers,
  lowStockProducts,
  customerName,
  type ErpOrder,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge, ErpEmptyState, ErpSectionHeader } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Fulfillment column
// ─────────────────────────────────────────────────────────────────────────────

function FulfillmentColumn({
  title,
  icon: Icon,
  orders,
  tone,
  emptyLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  orders: ErpOrder[];
  tone: "amber" | "cyan" | "lime";
  emptyLabel: string;
}) {
  const { t, locale } = useLocale();
  const cls = toneClasses(tone);

  return (
    <Card className="surface-elevated flex flex-col">
      <CardContent className="gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", cls.bg, cls.text)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          </div>
          <Badge variant="outline" className={cn("border-border bg-muted text-xs", cls.text)}>
            {orders.length}
          </Badge>
        </div>
        <ScrollArea className="max-h-[440px]">
          <ul className="space-y-2 p-3">
            {orders.length === 0 ? (
              <li className="flex items-center gap-2 px-2 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {emptyLabel}
              </li>
            ) : (
              orders.map((o) => {
                const total = o.items.reduce((s, li) => s + li.total, 0);
                return (
                  <motion.li
                    key={o.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg border border-border bg-card/60 p-3 transition-colors hover:bg-card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{o.number}</p>
                      <span className="text-xs text-muted-foreground">{formatCurrency(total, o.currency)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{customerName(o.customerId)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {o.items.length} {t("erp.order.items").toLowerCase()} · {o.fulfillment.carrier}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(o.createdAt, locale)}</span>
                    </div>
                  </motion.li>
                );
              })
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OperationsView
// ─────────────────────────────────────────────────────────────────────────────

export function OperationsView() {
  const { t, locale } = useLocale();

  const toShip = useMemo(
    () => erpOrders.filter((o) => o.status === "confirmed" || o.status === "pending" || o.status === "processing" || o.status === "draft"),
    [],
  );
  const shipping = useMemo(() => erpOrders.filter((o) => o.status === "shipped"), []);
  const delivered = useMemo(() => erpOrders.filter((o) => o.status === "delivered"), []);

  const lowStock = useMemo(() => lowStockProducts(), []);
  const suggestedPOs = useMemo(() => {
    return lowStock.map((p, idx) => {
      const supplier = erpSuppliers[idx % erpSuppliers.length];
      const suggestedQty = Math.max(p.reorderPoint * 3 - p.stock, p.reorderPoint * 2);
      const unitCost = p.cost;
      return {
        product: p,
        supplier,
        suggestedQty,
        unitCost,
        total: suggestedQty * unitCost,
      };
    });
  }, [lowStock]);

  const tasksByStatus = useMemo(() => ({
    todo: erpTasks.filter((tk) => tk.status === "todo"),
    inProgress: erpTasks.filter((tk) => tk.status === "in_progress"),
    blocked: erpTasks.filter((tk) => tk.status === "blocked"),
    done: erpTasks.filter((tk) => tk.status === "done"),
  }), []);

  const sortedTasks = useMemo(
    () => [...erpTasks].sort((a, b) => +new Date(a.due) - +new Date(b.due)),
    [],
  );

  return (
    <div className="space-y-6">
      {/* Fulfillment pipeline */}
      <section>
        <ErpSectionHeader
          icon={Truck}
          title={t("erp.ops.fulfillment")}
          subtitle={`${toShip.length + shipping.length} active · ${delivered.length} delivered`}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FulfillmentColumn
            title={t("erp.ops.toShip")}
            icon={Package}
            orders={toShip}
            tone="amber"
            emptyLabel={t("erp.common.noData")}
          />
          <FulfillmentColumn
            title={t("erp.ops.shipping")}
            icon={Truck}
            orders={shipping}
            tone="cyan"
            emptyLabel={t("erp.common.noData")}
          />
          <FulfillmentColumn
            title={t("erp.ops.delivered")}
            icon={CheckCircle2}
            orders={delivered}
            tone="lime"
            emptyLabel={t("erp.common.noData")}
          />
        </div>
      </section>

      {/* Procurement queue + Tasks */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Procurement queue */}
        <Card className="surface-elevated lg:col-span-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber" />
                <h2 className="text-sm font-semibold text-foreground">{t("erp.ops.procurement")}</h2>
              </div>
              <span className="text-xs text-muted-foreground">{lowStock.length} {t("erp.kpi.lowStock").toLowerCase()}</span>
            </div>

            <div className="max-h-[480px] overflow-auto">
              {suggestedPOs.length === 0 ? (
                <div className="px-5 py-8 text-sm text-muted-foreground">
                  <CheckCircle2 className="mr-2 inline h-4 w-4 text-success" />
                  {t("erp.common.noData")}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {suggestedPOs.map((po) => (
                    <li key={po.product.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber/30 bg-amber/10 text-amber">
                        <PackageX className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{po.product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {po.product.sku} · {po.supplier.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{po.suggestedQty} units</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(po.total)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => toast.success(t("erp.toast.poCreated"))}
                      >
                        <Plus className="h-3 w-3" />
                        {t("erp.ops.createPo")}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="surface-elevated lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-violet" />
                <h2 className="text-sm font-semibold text-foreground">{t("erp.ops.tasks")}</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {tasksByStatus.todo.length + tasksByStatus.inProgress.length + tasksByStatus.blocked.length} open
              </span>
            </div>
            <ScrollArea className="max-h-[480px]">
              <ul className="divide-y divide-border">
                {sortedTasks.map((task) => {
                  const tone =
                    task.priority === "critical" ? "destructive" :
                    task.priority === "high" ? "warning" :
                    task.priority === "medium" ? "info" :
                    "muted";
                  const cls = toneClasses(tone);
                  const isOverdue = new Date(task.due).getTime() < Date.now() && task.status !== "done";
                  const StatusIcon =
                    task.status === "done" ? CheckCircle2 :
                    task.status === "in_progress" ? Loader2 :
                    task.status === "blocked" ? AlertTriangle :
                    Clock;
                  return (
                    <li key={task.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/30">
                      <span className={cn("mt-0.5 flex h-6 w-6 items-center justify-center rounded-md", cls.bg, cls.text)}>
                        <StatusIcon className={cn("h-3.5 w-3.5", task.status === "in_progress" && "animate-spin")} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-medium", task.status === "done" ? "text-muted-foreground line-through" : "text-foreground")}>
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <span>{task.assignee}</span>
                          <span>·</span>
                          <span className={cn(isOverdue && "text-destructive")}>
                            {t("erp.ops.due")}: {formatDate(task.due, locale)}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px] uppercase tracking-wider", cls.border, cls.bg, cls.text)}>
                        {task.priority}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default OperationsView;
