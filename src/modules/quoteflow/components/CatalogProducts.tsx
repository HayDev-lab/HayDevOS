"use client";

/**
 * CatalogProducts — searchable/filterable grid of products with CRUD via dialog.
 */

import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency, statusColor, toneClasses } from "@/lib/utils";

import { mockProducts, type MockProduct } from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditingProduct {
  id?: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  unit: string;
  stock: number;
}

const EMPTY: EditingProduct = {
  sku: "",
  name: "",
  description: "",
  price: 0,
  currency: "USD",
  unit: "unit",
  stock: 0,
};

export function CatalogProducts() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [editing, setEditing] = useState<EditingProduct | null>(null);
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<MockProduct[]>(mockProducts);

  const rows = useMemo(() => {
    return products.filter((p) => {
      if (currencyFilter !== "all" && p.currency !== currencyFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [products, search, currencyFilter]);

  const openNew = () => {
    setEditing({ ...EMPTY });
    setOpen(true);
  };
  const openEdit = (p: MockProduct) => {
    setEditing({ ...p });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (editing.id) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editing.id ? { ...(p as MockProduct), ...editing } : p)),
      );
      toast.success(t("quoteflow.catalog.updated"));
    } else {
      const newP: MockProduct = {
        id: `pr_${Date.now().toString(36)}`,
        orgId: "org_haydev",
        ...(editing as Omit<EditingProduct, "id">),
      } as MockProduct;
      setProducts((prev) => [newP, ...prev]);
      toast.success(t("quoteflow.catalog.created"));
    }
    setOpen(false);
    setEditing(null);
  };

  const remove = (p: MockProduct) => {
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    toast.error(t("quoteflow.catalog.deletedToast"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("quoteflow.catalog.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("quoteflow.catalog.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="h-9 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("quoteflow.quotes.filter.all")}</SelectItem>
              {["USD", "EUR", "RUB", "AMD", "GBP"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("quoteflow.catalog.search")}
              className="h-9 w-full pl-8 sm:w-64"
            />
          </div>
          <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={openNew}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("quoteflow.catalog.add")}</span>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="surface-elevated">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Boxes className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t("quoteflow.catalog.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const stockTone =
              p.stock >= 9999
                ? statusColor("connected")
                : p.stock <= 5
                  ? statusColor("warning")
                  : statusColor("active");
            const stockCls = toneClasses(stockTone);
            return (
              <Card key={p.id} className="surface-elevated group relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-md bg-cyan/10 text-cyan ring-1 ring-cyan/30">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
                        <div className="font-medium text-foreground">{p.name}</div>
                      </div>
                    </div>
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose hover:text-rose" onClick={() => remove(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="font-mono text-lg font-semibold text-foreground">
                      {formatCurrency(p.price, p.currency)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">/{p.unit}</span>
                    </div>
                    <Badge variant="outline" className={cn(stockCls.text, stockCls.bg, stockCls.border, "gap-1")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", stockCls.dot)} />
                      {p.stock >= 9999 ? t("quoteflow.catalog.unlimited") : p.stock <= 5 ? t("quoteflow.catalog.lowStock") : t("quoteflow.catalog.inStock")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / create dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("quoteflow.catalog.edit") : t("quoteflow.catalog.add")}</DialogTitle>
            <DialogDescription>{t("quoteflow.catalog.subtitle")}</DialogDescription>
          </DialogHeader>

          {editing && <ProductForm value={editing} onChange={setEditing} />}

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); setEditing(null); }}>
              {t("common.cancel")}
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={save}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({
  value,
  onChange,
}: {
  value: EditingProduct;
  onChange: (v: EditingProduct) => void;
}) {
  const { t } = useLocale();
  // Touch local state to ensure proper re-render on each input change.
  const [local, setLocal] = useState<EditingProduct>(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const update = (patch: Partial<EditingProduct>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("quoteflow.catalog.sku")}</Label>
        <Input value={local.sku} onChange={(e) => update({ sku: e.target.value })} className="h-9 font-mono" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("quoteflow.catalog.name")}</Label>
        <Input value={local.name} onChange={(e) => update({ name: e.target.value })} className="h-9" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground">{t("quoteflow.catalog.description")}</Label>
        <Textarea rows={2} value={local.description} onChange={(e) => update({ description: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("quoteflow.catalog.price")}</Label>
        <Input type="number" min={0} step="0.01" value={local.price} onChange={(e) => update({ price: Number(e.target.value) })} className="h-9 font-mono" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("quoteflow.settings.currency")}</Label>
        <Select value={local.currency} onValueChange={(v) => update({ currency: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["USD", "EUR", "RUB", "AMD", "GBP"].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("quoteflow.catalog.unit")}</Label>
        <Input value={local.unit} onChange={(e) => update({ unit: e.target.value })} className="h-9" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t("quoteflow.catalog.stock")}</Label>
        <Input type="number" min={0} value={local.stock} onChange={(e) => update({ stock: Number(e.target.value) })} className="h-9 font-mono" />
      </div>
    </div>
  );
}
