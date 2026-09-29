"use client";

/**
 * ProductsView — products & services catalog with margin calc + CRUD mock.
 */

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Boxes,
  Pencil,
  Trash2,
  Tag,
} from "lucide-react";

import { useLocale } from "@/lib/i18n";
import {
  cn,
  formatCurrency,
  toneClasses,
} from "@/lib/utils";
import { toast } from "sonner";

import {
  erpProducts,
  productMarginPct,
  type ErpProduct,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { StatusBadge, ErpEmptyState, ErpSectionHeader, HighRiskConfirm } from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// Product edit/create dialog
// ─────────────────────────────────────────────────────────────────────────────

function ProductDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ErpProduct | null;
}) {
  const { t } = useLocale();
  const isEdit = !!product;

  // Local draft state — initialized from product when edit
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "License");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [cost, setCost] = useState(product?.cost ?? 0);
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [status, setStatus] = useState<ErpProduct["status"]>(product?.status ?? "active");
  const [description, setDescription] = useState(product?.description ?? "");

  const margin = price > 0 ? Math.round(((price - cost) / price) * 1000) / 10 : 0;
  const marginTone = margin >= 60 ? "success" : margin >= 40 ? "warning" : "destructive";
  const cls = toneClasses(marginTone);

  const handleSave = () => {
    if (!name || !sku) {
      toast.error(t("erp.toast.productRequired"));
      return;
    }
    toast.success(t("erp.toast.productSaved"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-cyan" />
            {isEdit ? t("erp.product.edit") : t("erp.product.new")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? product?.sku : t("erp.product.new")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("erp.product.sku")}</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="HAY-XXX-YY" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("erp.product.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("erp.product.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["License", "Add-on", "Service", "Module", "Credits"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("erp.product.status")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ErpProduct["status"])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t("erp.product.active")}</SelectItem>
                <SelectItem value="discontinued">{t("erp.product.discontinued")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("erp.product.price")} (USD)</Label>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("erp.product.cost")} (USD)</Label>
            <Input type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("erp.product.stock")}</Label>
            <Input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("erp.product.margin")}</Label>
            <div className={cn(
              "flex h-9 items-center justify-between rounded-md border px-3 text-sm font-semibold",
              cls.border, cls.bg, cls.text,
            )}>
              <span>{margin.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">
                {formatCurrency(price - cost)} / unit
              </span>
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("erp.product.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProductsView
// ─────────────────────────────────────────────────────────────────────────────

export function ProductsView() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ErpProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ErpProduct | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(erpProducts.map((p) => p.category))),
    [],
  );

  const filtered = useMemo(() => {
    return erpProducts.filter((p) => {
      if (catFilter !== "all" && p.category !== catFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${p.sku} ${p.name} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, catFilter]);

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };

  const openEdit = (p: ErpProduct) => {
    setEditing(p);
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <ErpSectionHeader
        icon={Boxes}
        title={t("erp.product.title")}
        subtitle={`${filtered.length} / ${erpProducts.length}`}
        right={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t("erp.product.new")}
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
                placeholder={t("erp.product.sku") + " / " + t("erp.product.name")}
                className="pl-9"
              />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder={t("erp.product.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("erp.product.sku")}</TableHead>
                  <TableHead>{t("erp.product.name")}</TableHead>
                  <TableHead>{t("erp.product.category")}</TableHead>
                  <TableHead className="text-right">{t("erp.product.price")}</TableHead>
                  <TableHead className="text-right">{t("erp.product.cost")}</TableHead>
                  <TableHead className="text-right">{t("erp.product.margin")}</TableHead>
                  <TableHead className="text-right">{t("erp.product.stock")}</TableHead>
                  <TableHead>{t("erp.product.status")}</TableHead>
                  <TableHead className="w-20 text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}><ErpEmptyState /></TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const margin = productMarginPct(p);
                    const marginTone = margin >= 60 ? "success" : margin >= 40 ? "warning" : "destructive";
                    const cls = toneClasses(marginTone);
                    const isLowStock = p.reorderPoint > 0 && p.stock <= p.reorderPoint;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.warehouseLocation}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border bg-muted text-[10px] uppercase tracking-wider">
                            {p.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(p.price, p.currency)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(p.cost, p.currency)}</TableCell>
                        <TableCell className={cn("text-right text-sm font-semibold", cls.text)}>
                          {margin.toFixed(1)}%
                        </TableCell>
                        <TableCell className={cn("text-right text-sm font-medium", isLowStock && "text-amber")}>
                          {p.stock}
                          {isLowStock ? (
                            <span className="ml-1 text-[10px] uppercase tracking-wider text-amber">{t("erp.inventory.lowStock")}</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.status === "active" ? "active" : "archived"} label={p.status === "active" ? t("erp.product.active") : t("erp.product.discontinued")} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      <ProductDialog open={editOpen} onOpenChange={setEditOpen} product={editing} />

      <HighRiskConfirm
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        actionLabel={deleteTarget ? `${t("erp.product.delete")}: ${deleteTarget.name} (${deleteTarget.sku})` : ""}
        tone="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            toast.success(t("erp.toast.productDeleted"));
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

export default ProductsView;
