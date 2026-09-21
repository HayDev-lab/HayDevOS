"use client";

/**
 * PricingRulesView — list + edit dialog + sample application.
 *
 * Each rule has a name, type, and configuration (tiers/minPrice/setupFee/etc).
 * The "Sample application" panel lets the user plug a sample qty + unit price
 * and see how the rule transforms the unit price / total.
 */

import { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Layers,
  CircleDollarSign,
  Rocket,
  Repeat,
  TrendingUp,
  Play,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency } from "@/lib/utils";

import {
  mockPricingRules,
  applyRule,
  round2,
  type PricingRule,
  type PricingRuleType,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";

const RULE_ICON: Record<PricingRuleType, typeof Layers> = {
  tiered: Layers,
  minimum: CircleDollarSign,
  setup: Rocket,
  recurring: Repeat,
  markup: TrendingUp,
};

interface RuleForm {
  id?: string;
  name: string;
  type: PricingRuleType;
  active: boolean;
  appliesToSku?: string;
  minPrice?: number;
  setupFee?: number;
  markupPct?: number;
  recurringPeriod?: "monthly" | "yearly";
  tiers?: { qty: number; unitPrice: number }[];
}

const EMPTY_RULE: RuleForm = {
  name: "",
  type: "tiered",
  active: true,
  tiers: [{ qty: 1, unitPrice: 0 }],
};

export function PricingRulesView() {
  const { t } = useLocale();
  const [rules, setRules] = useState<PricingRule[]>(mockPricingRules);
  const [editing, setEditing] = useState<RuleForm | null>(null);
  const [open, setOpen] = useState(false);

  // Sample application state
  const [sampleQty, setSampleQty] = useState<number>(50);
  const [sampleUnitPrice, setSampleUnitPrice] = useState<number>(2200);

  const openNew = () => {
    setEditing({ ...EMPTY_RULE, tiers: [{ qty: 1, unitPrice: 0 }] });
    setOpen(true);
  };
  const openEdit = (r: PricingRule) => {
    setEditing({
      id: r.id,
      name: r.name,
      type: r.type,
      active: r.active,
      appliesToSku: r.appliesToSku,
      minPrice: r.minPrice,
      setupFee: r.setupFee,
      markupPct: r.markupPct,
      recurringPeriod: r.recurringPeriod,
      tiers: r.tiers ? r.tiers.map((t) => ({ ...t })) : undefined,
    });
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    const base = {
      id: editing.id ?? `rule_${Date.now().toString(36)}`,
      name: editing.name || "Untitled rule",
      type: editing.type,
      active: editing.active,
      appliesToSku: editing.appliesToSku,
      minPrice: editing.minPrice,
      setupFee: editing.setupFee,
      markupPct: editing.markupPct,
      recurringPeriod: editing.recurringPeriod,
      tiers: editing.tiers,
    };
    if (editing.id) {
      setRules((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...base } : r)));
      toast.success(t("quoteflow.rules.updated"));
    } else {
      setRules((prev) => [...prev, base as PricingRule]);
      toast.success(t("quoteflow.rules.created"));
    }
    setOpen(false);
    setEditing(null);
  };

  const remove = (r: PricingRule) => {
    setRules((prev) => prev.filter((x) => x.id !== r.id));
    toast.error(t("quoteflow.rules.deletedToast"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-cyan" />
            {t("quoteflow.rules.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("quoteflow.rules.subtitle")}</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={openNew}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("quoteflow.rules.new")}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rules.map((r) => {
          const Icon = RULE_ICON[r.type];
          const sample = applyRule(r, sampleQty, sampleUnitPrice);
          const lineGross = round2(sample.unitPrice * sampleQty + sample.setupFee);
          return (
            <Card key={r.id} className="surface-elevated group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-cyan/10 text-cyan ring-1 ring-cyan/30">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t(`quoteflow.rules.type.${r.type}` as const)}
                        {r.appliesToSku ? ` · ${r.appliesToSku}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose hover:text-rose" onClick={() => remove(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Config */}
                <div className="mt-3 rounded-lg bg-muted/30 p-2.5 text-xs">
                  {r.type === "tiered" && r.tiers && (
                    <div className="space-y-0.5 font-mono">
                      {r.tiers.map((tier, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-muted-foreground">qty ≥ {tier.qty}</span>
                          <span className="text-foreground">{formatCurrency(tier.unitPrice, "USD")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {r.type === "minimum" && (
                    <div className="font-mono text-foreground">≥ {formatCurrency(r.minPrice ?? 0, "USD")}</div>
                  )}
                  {r.type === "setup" && (
                    <div className="font-mono text-foreground">+ {formatCurrency(r.setupFee ?? 0, "USD")} setup</div>
                  )}
                  {r.type === "recurring" && (
                    <div className="font-mono text-foreground capitalize">{r.recurringPeriod ?? "monthly"}</div>
                  )}
                  {r.type === "markup" && (
                    <div className="font-mono text-foreground">+{r.markupPct ?? 0}% markup</div>
                  )}
                </div>

                {/* Sample application */}
                <div className="mt-3 rounded-lg border border-border p-2.5">
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Play className="h-3 w-3" />
                    {t("quoteflow.rules.sample")}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">{t("quoteflow.rules.sampleQty")}</Label>
                      <Input type="number" min={0} value={sampleQty} onChange={(e) => setSampleQty(Number(e.target.value))} className="h-7 font-mono text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">{t("quoteflow.rules.sampleUnitPrice")}</Label>
                      <Input type="number" min={0} step="0.01" value={sampleUnitPrice} onChange={(e) => setSampleUnitPrice(Number(e.target.value))} className="h-7 font-mono text-xs" />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-xs">
                    <div className="rounded bg-background/50 p-1.5">
                      <div className="text-[10px] text-muted-foreground">unit</div>
                      <div className="text-foreground">{formatCurrency(sample.unitPrice, "USD")}</div>
                    </div>
                    <div className="rounded bg-background/50 p-1.5">
                      <div className="text-[10px] text-muted-foreground">setup</div>
                      <div className="text-amber">{formatCurrency(sample.setupFee, "USD")}</div>
                    </div>
                    <div className="rounded bg-background/50 p-1.5">
                      <div className="text-[10px] text-muted-foreground">{t("quoteflow.builder.lineTotal")}</div>
                      <div className="text-lime">{formatCurrency(lineGross, "USD")}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit / create dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("quoteflow.rules.edit") : t("quoteflow.rules.new")}</DialogTitle>
            <DialogDescription>{t("quoteflow.rules.config")}</DialogDescription>
          </DialogHeader>

          {editing && <RuleFormView value={editing} onChange={setEditing} />}

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

function RuleFormView({
  value,
  onChange,
}: {
  value: RuleForm;
  onChange: (v: RuleForm) => void;
}) {
  const { t } = useLocale();
  const [local, setLocal] = useState<RuleForm>(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const update = (patch: Partial<RuleForm>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("quoteflow.rules.name")}</Label>
          <Input value={local.name} onChange={(e) => update({ name: e.target.value })} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("quoteflow.rules.type")}</Label>
          <Select value={local.type} onValueChange={(v) => update({ type: v as PricingRuleType })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["tiered", "minimum", "setup", "recurring", "markup"] as PricingRuleType[]).map((tp) => (
                <SelectItem key={tp} value={tp}>{t(`quoteflow.rules.type.${tp}` as const)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={local.active} onCheckedChange={(c) => update({ active: c })} />
        <Label className="text-sm text-muted-foreground">{t("quoteflow.rules.active")}</Label>
      </div>

      {local.type === "tiered" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{t("quoteflow.rules.tiers")}</Label>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              onClick={() =>
                update({ tiers: [...(local.tiers ?? []), { qty: 1, unitPrice: 0 }] })
              }
            >
              <Plus className="h-3 w-3" />
              {t("quoteflow.rules.addTier")}
            </Button>
          </div>
          {(local.tiers ?? []).map((tier, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={tier.qty}
                onChange={(e) => {
                  const tiers = [...(local.tiers ?? [])];
                  tiers[i] = { ...tier, qty: Number(e.target.value) };
                  update({ tiers });
                }}
                className="h-9 font-mono"
              />
              <span className="text-muted-foreground">×</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={tier.unitPrice}
                onChange={(e) => {
                  const tiers = [...(local.tiers ?? [])];
                  tiers[i] = { ...tier, unitPrice: Number(e.target.value) };
                  update({ tiers });
                }}
                className="h-9 font-mono"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0 text-rose hover:text-rose"
                onClick={() => update({ tiers: (local.tiers ?? []).filter((_, idx) => idx !== i) })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {local.type === "minimum" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("quoteflow.rules.minPrice")}</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={local.minPrice ?? 0}
            onChange={(e) => update({ minPrice: Number(e.target.value) })}
            className="h-9 font-mono"
          />
        </div>
      )}

      {local.type === "setup" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("quoteflow.rules.setupFee")}</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={local.setupFee ?? 0}
            onChange={(e) => update({ setupFee: Number(e.target.value) })}
            className="h-9 font-mono"
          />
        </div>
      )}

      {local.type === "recurring" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("quoteflow.rules.recurringPeriod")}</Label>
          <Select
            value={local.recurringPeriod ?? "monthly"}
            onValueChange={(v) => update({ recurringPeriod: v as "monthly" | "yearly" })}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{t("quoteflow.rules.recurringPeriod.monthly")}</SelectItem>
              <SelectItem value="yearly">{t("quoteflow.rules.recurringPeriod.yearly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {local.type === "markup" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("quoteflow.rules.markupPct")}</Label>
          <Input
            type="number"
            min={0}
            step="0.1"
            value={local.markupPct ?? 0}
            onChange={(e) => update({ markupPct: Number(e.target.value) })}
            className="h-9 font-mono"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">SKU (optional)</Label>
        <Input
          value={local.appliesToSku ?? ""}
          onChange={(e) => update({ appliesToSku: e.target.value || undefined })}
          placeholder="e.g. HAY-ENT-AN"
          className="h-9 font-mono"
        />
      </div>
    </div>
  );
}
