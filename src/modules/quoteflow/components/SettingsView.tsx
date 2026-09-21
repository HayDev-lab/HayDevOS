"use client";

/**
 * SettingsView — currencies, tax rates, numbering, default templates, approval thresholds.
 */

import { useState } from "react";
import { Settings, Coins, Percent, Hash, LayoutTemplate, ShieldCheck, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { mockTemplates } from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface CurrencyRow { code: string; symbol: string; }
interface TaxRow { name: string; rate: number; }

const DEFAULT_CURRENCIES: CurrencyRow[] = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "RUB", symbol: "₽" },
  { code: "AMD", symbol: "֏" },
];

const DEFAULT_TAXES: TaxRow[] = [
  { name: "Standard", rate: 20 },
  { name: "Reduced", rate: 10 },
  { name: "Zero", rate: 0 },
];

export function SettingsView() {
  const { t } = useLocale();

  const [currencies, setCurrencies] = useState<CurrencyRow[]>(DEFAULT_CURRENCIES);
  const [taxes, setTaxes] = useState<TaxRow[]>(DEFAULT_TAXES);
  const [prefix, setPrefix] = useState("Q-2026-");
  const [nextNumber, setNextNumber] = useState(150);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [defaultTax, setDefaultTax] = useState(20);
  const [defaultValidDays, setDefaultValidDays] = useState(30);
  const [discountThreshold, setDiscountThreshold] = useState(5);
  const [marginThreshold, setMarginThreshold] = useState(45);
  const [valueThreshold, setValueThreshold] = useState(250000);
  const [defaultTemplateHy, setDefaultTemplateHy] = useState("tpl_hy_standard");
  const [defaultTemplateRu, setDefaultTemplateRu] = useState("tpl_ru_standard");
  const [defaultTemplateEn, setDefaultTemplateEn] = useState("tpl_en_standard");

  const addCurrency = () => setCurrencies((p) => [...p, { code: "", symbol: "" }]);
  const removeCurrency = (idx: number) => setCurrencies((p) => p.filter((_, i) => i !== idx));
  const updateCurrency = (idx: number, patch: Partial<CurrencyRow>) =>
    setCurrencies((p) => p.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const addTax = () => setTaxes((p) => [...p, { name: "", rate: 0 }]);
  const removeTax = (idx: number) => setTaxes((p) => p.filter((_, i) => i !== idx));
  const updateTax = (idx: number, patch: Partial<TaxRow>) =>
    setTaxes((p) => p.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const save = () => toast.success(t("quoteflow.settings.saved"));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Settings className="h-4 w-4 text-cyan" />
            {t("quoteflow.settings.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("quoteflow.settings.subtitle")}</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={save}>
          <Save className="h-4 w-4" />
          {t("common.save")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Currencies */}
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              {t("quoteflow.settings.currencies")}
            </h3>
            <div className="space-y-2">
              {currencies.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={c.code}
                    onChange={(e) => updateCurrency(i, { code: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    className="h-9 w-24 font-mono"
                  />
                  <Input
                    value={c.symbol}
                    onChange={(e) => updateCurrency(i, { symbol: e.target.value })}
                    placeholder="$"
                    className="h-9 w-16 text-center"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-rose hover:text-rose"
                    onClick={() => removeCurrency(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={addCurrency}>
                <Plus className="h-3.5 w-3.5" />
                {t("quoteflow.settings.add")}
              </Button>
            </div>
            <Separator className="my-3" />
            <Field label={t("quoteflow.settings.defaultCurrency")}>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.filter((c) => c.code).map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* Tax rates */}
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Percent className="h-3.5 w-3.5" />
              {t("quoteflow.settings.taxRates")}
            </h3>
            <div className="space-y-2">
              {taxes.map((tx, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={tx.name}
                    onChange={(e) => updateTax(i, { name: e.target.value })}
                    placeholder="Standard"
                    className="h-9 flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={tx.rate}
                    onChange={(e) => updateTax(i, { rate: Number(e.target.value) })}
                    className="h-9 w-24 font-mono text-right"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0 text-rose hover:text-rose"
                    onClick={() => removeTax(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={addTax}>
                <Plus className="h-3.5 w-3.5" />
                {t("quoteflow.settings.add")}
              </Button>
            </div>
            <Separator className="my-3" />
            <Field label={t("quoteflow.settings.defaultTax")}>
              <Input
                type="number"
                min={0}
                max={100}
                value={defaultTax}
                onChange={(e) => setDefaultTax(Number(e.target.value))}
                className="h-9 font-mono"
              />
            </Field>
            <Field label={t("quoteflow.settings.defaultValidDays")} className="mt-3">
              <Input
                type="number"
                min={1}
                value={defaultValidDays}
                onChange={(e) => setDefaultValidDays(Number(e.target.value))}
                className="h-9 font-mono"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Numbering */}
        <Card className="surface-elevated">
          <CardContent className="p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              {t("quoteflow.settings.numbering")}
            </h3>
            <Field label={t("quoteflow.settings.prefix")}>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} className="h-9 font-mono" />
            </Field>
            <Field label={t("quoteflow.settings.nextNumber")}>
              <Input
                type="number"
                min={1}
                value={nextNumber}
                onChange={(e) => setNextNumber(Number(e.target.value))}
                className="h-9 font-mono"
              />
            </Field>
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">{t("quoteflow.quotes.number")}: </span>
              <span className="font-mono font-medium text-foreground">
                {prefix}{String(nextNumber).padStart(4, "0")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Approval thresholds */}
        <Card className="surface-elevated">
          <CardContent className="p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("quoteflow.settings.thresholds")}
            </h3>
            <Field label={t("quoteflow.settings.discountThreshold")}>
              <Input
                type="number"
                min={0}
                max={100}
                value={discountThreshold}
                onChange={(e) => setDiscountThreshold(Number(e.target.value))}
                className="h-9 font-mono"
              />
            </Field>
            <Field label={t("quoteflow.settings.marginThreshold")}>
              <Input
                type="number"
                min={0}
                max={100}
                value={marginThreshold}
                onChange={(e) => setMarginThreshold(Number(e.target.value))}
                className="h-9 font-mono"
              />
            </Field>
            <Field label={t("quoteflow.settings.valueThreshold")}>
              <Input
                type="number"
                min={0}
                value={valueThreshold}
                onChange={(e) => setValueThreshold(Number(e.target.value))}
                className="h-9 font-mono"
              />
            </Field>
            <div className="rounded-lg bg-amber/5 p-3 ring-1 ring-amber/20 text-xs text-amber">
              Quotes exceeding <span className="font-mono font-bold">{discountThreshold}%</span> discount,
              {" "}<span className="font-mono font-bold">{marginThreshold}%</span> margin floor, or
              {" "}<span className="font-mono font-bold">{valueThreshold}</span> value trigger approval.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Default templates */}
      <Card className="surface-elevated">
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <LayoutTemplate className="h-3.5 w-3.5" />
            {t("quoteflow.settings.defaultTemplate")}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={t("quoteflow.settings.localeHy")}>
              <Select value={defaultTemplateHy} onValueChange={setDefaultTemplateHy}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockTemplates.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("quoteflow.settings.localeRu")}>
              <Select value={defaultTemplateRu} onValueChange={setDefaultTemplateRu}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockTemplates.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("quoteflow.settings.localeEn")}>
              <Select value={defaultTemplateEn} onValueChange={setDefaultTemplateEn}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockTemplates.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
