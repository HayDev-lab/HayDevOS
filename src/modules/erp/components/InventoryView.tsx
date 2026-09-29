"use client";

/**
 * InventoryView — warehouse view with stock levels + reorder point alerts,
 * movements history, and "Stock Adjustment" dialog (high-risk financial action).
 */

import { useMemo, useState } from "react";
import {
  Search,
  Warehouse,
  PackageX,
  SlidersHorizontal,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  toneClasses,
} from "@/lib/utils";
import { toast } from "sonner";

import {
  erpProducts,
  erpInventoryMovements,
  productById,
  type ErpProduct,
  type ErpMovementType,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AiProtectedBadge,
  StatusBadge,
  ErpEmptyState,
  ErpSectionHeader,
  HighRiskConfirm,
} from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Stock adjustment dialog
// ─────────────────────────────────────────────────────────────────────────────

function StockAdjustDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ErpProduct | null;
}) {
  const { t } = useLocale();
  const [productId, setProductId] = useState<string>(product?.id ?? "");
  const [type, setType] = useState<"in" | "out" | "set">("in");
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const target = productId ? productById(productId) ?? product : product;
  const newStock = useMemo(() => {
    if (!target) return 0;
    if (type === "in") return target.stock + qty;
    if (type === "out") return Math.max(0, target.stock - qty);
    return qty;
  }, [target, type, qty]);

  const handleApply = () => {
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (target) {
      toast.success(t("erp.toast.stockAdjusted", { sku: target.sku }));
    }
    setQty(1);
    setReason("");
    setType("in");
    onOpenChange(false);
  };

  if (!target) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-amber" />
              {t("erp.inventory.adjust.dialogTitle")}
            </DialogTitle>
            <DialogDescription>{target.sku} · {target.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("erp.inventory.selectProduct")}</Label>
              <Select
                value={productId || target.id}
                onValueChange={setProductId}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {erpProducts.filter((p) => p.reorderPoint > 0 || p.stock < 1000).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} · {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("erp.inventory.adjust.type")}</Label>
                <Select value={type} onValueChange={(v) => setType(v as "in" | "out" | "set")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">{t("erp.inventory.adjust.in")}</SelectItem>
                    <SelectItem value="out">{t("erp.inventory.adjust.out")}</SelectItem>
                    <SelectItem value="set">{t("erp.inventory.adjust.set")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("erp.inventory.adjust.qty")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={qty}
                  onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("erp.inventory.adjust.reason")}</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Vendor restock / cycle count / damage…"
              />
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("erp.inventory.currentStock")}</span>
                <span className="font-medium text-foreground">{target.stock}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">{t("erp.inventory.afterAdjustment")}</span>
                <span className={cn(
                  "font-semibold",
                  newStock > target.stock ? "text-success" : newStock < target.stock ? "text-destructive" : "text-foreground",
                )}>
                  {newStock}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleApply} className="bg-amber text-amber-foreground hover:bg-amber/90">
              <SlidersHorizontal className="h-4 w-4" />
              {t("erp.inventory.adjust")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HighRiskConfirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        actionLabel={`${t("erp.inventory.adjust")}: ${target.sku} → ${newStock}`}
        details={
          <div className="space-y-1">
            <div>{t("erp.inventory.adjust.type")}: <span className="font-mono">{type}</span></div>
            <div>{t("erp.inventory.adjust.qty")}: <span className="font-mono">{qty}</span></div>
            <div>{t("erp.inventory.adjust.reason")}: <span className="font-mono">{reason || "—"}</span></div>
            <div>{t("erp.inventory.current")}: <span className="font-mono">{target.stock}</span> → {t("erp.inventory.new")}: <span className="font-mono">{newStock}</span></div>
          </div>
        }
        tone="primary"
        onConfirm={handleConfirm}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InventoryView
// ─────────────────────────────────────────────────────────────────────────────

export function InventoryView() {
  const { t, locale } = useLocale();
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<ErpProduct | null>(null);

  const stockProducts = useMemo(
    () => erpProducts.filter((p) => p.reorderPoint > 0 || p.stock < 1000),
    [],
  );

  const filtered = useMemo(() => {
    return stockProducts.filter((p) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${p.sku} ${p.name} ${p.warehouseLocation}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, stockProducts]);

  const movements = useMemo(
    () => [...erpInventoryMovements].sort((a, b) => +new Date(b.ts) - +new Date(a.ts)),
    [],
  );

  const openAdjust = (p?: ErpProduct) => {
    setAdjustProduct(p ?? null);
    setAdjustOpen(true);
  };

  return (
    <div className="space-y-4">
      <ErpSectionHeader
        icon={Warehouse}
        title={t("erp.inventory.title")}
        subtitle={`${filtered.length} items · ${erpInventoryMovements.length} movements`}
        right={
          <div className="flex items-center gap-2">
            <AiProtectedBadge withTooltip />
            <Button size="sm" variant="outline" onClick={() => openAdjust()}>
              <SlidersHorizontal className="h-4 w-4" />
              {t("erp.inventory.adjust")}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">{t("erp.inventory.title")}</TabsTrigger>
          <TabsTrigger value="movements">{t("erp.inventory.movements")}</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-3">
          <Card className="surface-elevated">
            <CardContent className="gap-0 p-0">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("erp.product.sku") + " / " + t("erp.product.name")}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="max-h-[560px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("erp.product.sku")}</TableHead>
                      <TableHead>{t("erp.product.name")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("erp.inventory.location")}</TableHead>
                      <TableHead className="text-right">{t("erp.inventory.onHand")}</TableHead>
                      <TableHead className="text-right">{t("erp.inventory.reserved")}</TableHead>
                      <TableHead className="text-right">{t("erp.inventory.available")}</TableHead>
                      <TableHead className="text-right">{t("erp.inventory.reorder")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8}><ErpEmptyState /></TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((p) => {
                        const isLow = p.reorderPoint > 0 && p.stock <= p.reorderPoint;
                        const available = Math.max(0, p.stock - p.reserved);
                        return (
                          <TableRow
                            key={p.id}
                            className={cn(isLow && "bg-amber/5 hover:bg-amber/10")}
                          >
                            <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                            <TableCell>
                              <p className="text-sm font-medium text-foreground">{p.name}</p>
                              <p className="truncate text-xs text-muted-foreground md:hidden">{p.warehouseLocation}</p>
                            </TableCell>
                            <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{p.warehouseLocation}</TableCell>
                            <TableCell className={cn("text-right text-sm font-medium", isLow && "text-amber")}>
                              {p.stock}
                              {isLow ? <PackageX className="ml-1 inline h-3 w-3 text-amber" /> : null}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{p.reserved}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{available}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{p.reorderPoint || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => openAdjust(p)}
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                {t("erp.inventory.adjust")}
                              </Button>
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
        </TabsContent>

        <TabsContent value="movements" className="mt-3">
          <Card className="surface-elevated">
            <CardContent className="gap-0 p-0">
              <div className="max-h-[560px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("erp.inventory.adjust.type")}</TableHead>
                      <TableHead>{t("erp.product.sku")}</TableHead>
                      <TableHead>{t("erp.product.name")}</TableHead>
                      <TableHead className="text-right">{t("erp.inventory.adjust.qty")}</TableHead>
                      <TableHead>{t("erp.inventory.adjust.reason")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("erp.inventory.location")}</TableHead>
                      <TableHead className="hidden md:table-cell">{t("erp.payment.date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}><ErpEmptyState /></TableCell>
                      </TableRow>
                    ) : (
                      movements.map((m) => {
                        const tone =
                          m.type === "in" ? "success" :
                          m.type === "out" ? "destructive" :
                          "warning";
                        const cls = toneClasses(tone);
                        const Icon = m.type === "in" ? ArrowDownRight : m.type === "out" ? ArrowUpRight : RefreshCw;
                        return (
                          <TableRow key={m.id}>
                            <TableCell>
                              <Badge variant="outline" className={cn("gap-1 px-1.5 py-0 text-[10px] uppercase tracking-wider", cls.border, cls.bg, cls.text)}>
                                <Icon className="h-3 w-3" />
                                {t(`erp.inventory.movement.${m.type}` as const)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                            <TableCell className="text-sm font-medium">{m.productName}</TableCell>
                            <TableCell className={cn("text-right text-sm font-semibold", cls.text)}>
                              {m.type === "in" ? "+" : m.type === "out" ? "−" : "±"}{Math.abs(m.qty)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{m.reason}</TableCell>
                            <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{m.warehouse}</TableCell>
                            <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{formatDateTime(m.ts, locale)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StockAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        product={adjustProduct}
      />
    </div>
  );
}

export default InventoryView;
