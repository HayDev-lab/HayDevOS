"use client";

/**
 * QuoteBuilder — the CPQ builder.
 *
 * Layout:
 *   ┌────────────────────────────────────┬──────────────┐
 *   │ Header (customer/lead/currency/    │ Totals panel │
 *   │ validUntil/template)               │ (sticky)     │
 *   │ Line items editor                   │              │
 *   │ Pricing rules selector              │              │
 *   │ Quote discount / tax / notes        │              │
 *   ├────────────────────────────────────┤              │
 *   │ Actions: Save draft / Approval /    │              │
 *   │ Generate PDF / DOCX                 │              │
 *   └────────────────────────────────────┴──────────────┘
 *
 * The totals panel recomputes on every keystroke using the pricing engine
 * (`calculateQuote`) from ../pricing.ts. No eval, no side effects.
 *
 * Seed handling: the parent (QuoteFlowView) passes a `key` derived from the
 * seed, so this component fully remounts whenever the user clicks
 * "Create quote from request" / "New quote". Initial state is therefore seeded
 * directly from props on first render — no `useEffect` to sync.
 *
 * Dirty tracking: instead of a useEffect that flips `dirty` on every dep change
 * (which trips `react-hooks/set-state-in-effect`), we wrap every state mutator
 * in a `markDirty()` helper that flips the flag synchronously inside the event
 * handler. Save / Request-approval reset it.
 */

import { useMemo, useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  ShieldCheck,
  FileDown,
  FileText,
  StickyNote,
  Layers,
  User,
  Building2,
  Coins,
  Calendar,
  LayoutTemplate,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/lib/i18n";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import {
  mockProducts,
  mockLeads,
  mockCustomers,
  mockPricingRules,
  mockRulesById,
  mockTemplates,
  mockQuoteRequests,
  calculateQuote,
  type LineItemInput,
  type DiscountType,
  type PricingRule,
} from "../data";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface BuilderSeed {
  requestId?: string;
  leadId?: string;
  customerId?: string;
  products?: { productId: string; qty: number }[];
  budget?: number;
}

interface BuilderLine extends LineItemInput {
  uid: string;
}

let uidSeq = 0;
const nextUid = () => `bld_${Date.now().toString(36)}_${uidSeq++}`;

function emptyLine(): BuilderLine {
  return {
    uid: nextUid(),
    productId: "",
    productName: "",
    qty: 1,
    unitPrice: 0,
    discountType: "percent",
    discount: 0,
    ruleIds: [],
  };
}

/**
 * Compute the initial form state from a seed (lazy initial-state factory).
 * Pure — no side effects. The "prefilled" toast is fired by the parent
 * (`QuoteFlowView.openBuilder`) before switching to the Builder tab so this
 * component never needs an effect for seed hydration.
 */
function deriveInitialState(seed: BuilderSeed | null) {
  if (!seed) {
    return {
      leadId: "",
      customerId: "",
      currency: "USD",
      notes: "",
      lines: [emptyLine()],
    };
  }

  let currency = "USD";
  let notes = "";
  let lines: BuilderLine[] = [emptyLine()];

  if (seed.requestId) {
    const req = mockQuoteRequests.find((r) => r.id === seed.requestId);
    if (req) {
      const firstProduct = mockProducts[0];
      lines = [
        {
          uid: nextUid(),
          productId: firstProduct.id,
          productName: firstProduct.name,
          qty: 1,
          unitPrice: firstProduct.price,
          discountType: "percent",
          discount: 0,
          ruleIds: [],
        },
      ];
      notes = req.description;
      currency = req.currency;
    }
  } else if (seed.products && seed.products.length > 0) {
    lines = seed.products.map((p) => {
      const prod = mockProducts.find((x) => x.id === p.productId) ?? mockProducts[0];
      return {
        uid: nextUid(),
        productId: prod.id,
        productName: prod.name,
        qty: p.qty,
        unitPrice: prod.price,
        discountType: "percent" as const,
        discount: 0,
        ruleIds: [],
      };
    });
  }

  return {
    leadId: seed.leadId ?? "",
    customerId: seed.customerId ?? "",
    currency,
    notes,
    lines,
  };
}

export function QuoteBuilder({ seed }: { seed: BuilderSeed | null }) {
  const { t, locale } = useLocale();

  // ── Form state (seeded once on mount via lazy initial state) ──────────
  // The parent remounts this component (via `key`) when the seed changes,
  // so we never need an effect to re-sync from props.
  const [initial] = useState(() => deriveInitialState(seed));
  const [leadId, setLeadIdRaw] = useState<string>(initial.leadId);
  const [customerId, setCustomerIdRaw] = useState<string>(initial.customerId);
  const [currency, setCurrencyRaw] = useState<string>(initial.currency);
  const [validUntil, setValidUntilRaw] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [templateId, setTemplateIdRaw] = useState<string>("tpl_en_standard");
  const [lines, setLines] = useState<BuilderLine[]>(initial.lines);
  const [selectedRuleIds, setSelectedRuleIdsRaw] = useState<string[]>([]);
  const [quoteDiscountType, setQuoteDiscountTypeRaw] = useState<DiscountType>("percent");
  const [quoteDiscountValue, setQuoteDiscountValueRaw] = useState<number>(0);
  const [taxRate, setTaxRateRaw] = useState<number>(20);
  const [notes, setNotesRaw] = useState<string>(initial.notes);
  const [dirty, setDirty] = useState(false);
  // Stable preview quote number — generated once per builder mount so it
  // doesn't reshuffle on every keystroke. (Mock; a real save would persist this.)
  const [previewNumber] = useState<string>(() => {
    const seq = Math.floor(Math.random() * 9000 + 1000);
    return `Q-${new Date().getFullYear()}-${seq}`;
  });

  // Dirty-tracking wrappers — every state mutation marks the form dirty
  // synchronously inside the event handler (no useEffect).
  const markDirty = () => setDirty(true);
  const setLeadId = (v: string) => { setLeadIdRaw(v); markDirty(); };
  const setCustomerId = (v: string) => { setCustomerIdRaw(v); markDirty(); };
  const setCurrency = (v: string) => { setCurrencyRaw(v); markDirty(); };
  const setValidUntil = (v: string) => { setValidUntilRaw(v); markDirty(); };
  const setTemplateId = (v: string) => { setTemplateIdRaw(v); markDirty(); };
  const setQuoteDiscountType = (v: DiscountType) => { setQuoteDiscountTypeRaw(v); markDirty(); };
  const setQuoteDiscountValue = (v: number) => { setQuoteDiscountValueRaw(v); markDirty(); };
  const setTaxRate = (v: number) => { setTaxRateRaw(v); markDirty(); };
  const setNotes = (v: string) => { setNotesRaw(v); markDirty(); };
  const setSelectedRuleIds = (updater: string[] | ((prev: string[]) => string[])) => {
    setSelectedRuleIdsRaw(updater); markDirty();
  };

  // ── Line item helpers ──────────────────────────────────────────────────
  const updateLine = (uid: string, patch: Partial<BuilderLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)),
    );
    markDirty();
  };

  const onProductChange = (uid: string, productId: string) => {
    const p = mockProducts.find((x) => x.id === productId);
    if (!p) return;
    updateLine(uid, {
      productId: p.id,
      productName: p.name,
      unitPrice: p.price,
    });
  };

  const addLine = () => { setLines((prev) => [...prev, emptyLine()]); markDirty(); };
  const removeLine = (uid: string) => {
    setLines((prev) => prev.filter((l) => l.uid !== uid));
    markDirty();
  };
  const moveLine = (uid: string, dir: -1 | 1) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.uid === uid);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = prev.slice();
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
    markDirty();
  };

  const toggleRule = (ruleId: string) => {
    setSelectedRuleIds((prev) =>
      prev.includes(ruleId) ? prev.filter((r) => r !== ruleId) : [...prev, ruleId],
    );
  };

  // ── Live calculation ───────────────────────────────────────────────────
  // Apply all selected rules to every line for the preview (rule.skus would
  // refine this in production; for the builder demo we surface the chosen rules
  // and let the engine show their impact uniformly).
  const activeRules: PricingRule[] = useMemo(
    () => mockPricingRules.filter((r) => selectedRuleIds.includes(r.id)),
    [selectedRuleIds],
  );

  const engineItems: LineItemInput[] = useMemo(
    () =>
      lines.map((l) => ({
        productId: l.productId,
        productName: l.productName || "—",
        qty: Number(l.qty) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discountType: l.discountType,
        discount: Number(l.discount) || 0,
        ruleIds: activeRules.map((r) => r.id),
      })),
    [lines, activeRules],
  );

  const calc = useMemo(
    () =>
      calculateQuote(
        engineItems,
        { type: quoteDiscountType, value: quoteDiscountValue },
        taxRate,
        undefined,
        currency,
        mockRulesById,
      ),
    [engineItems, quoteDiscountType, quoteDiscountValue, taxRate, currency],
  );

  // ── Actions ────────────────────────────────────────────────────────────
  const saveDraft = () => {
    setDirty(false);
    toast.success(t("quoteflow.builder.saved"));
  };
  const requestApproval = () => {
    toast.info(t("quoteflow.builder.approvalRequested"));
    setDirty(false);
  };
  const generatePdf = () => toast.success(t("quoteflow.builder.pdfQueued"));
  const generateDocx = () => toast.success(t("quoteflow.builder.docxQueued"));

  // ── Lookups ────────────────────────────────────────────────────────────
  const customer = mockCustomers.find((c) => c.id === customerId);
  const lead = mockLeads.find((l) => l.id === leadId);
  const template = mockTemplates.find((t) => t.id === templateId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("quoteflow.builder.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("quoteflow.builder.subtitle")}
          </p>
        </div>
        {dirty && (
          <Badge variant="outline" className="gap-1 border-amber/30 bg-amber/5 text-amber">
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            {t("quoteflow.builder.unsaved")}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* LEFT — form */}
        <div className="space-y-4">
          {/* Header */}
          <Card className="surface-elevated">
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <LayoutTemplate className="h-3.5 w-3.5" />
                {t("quoteflow.builder.header")}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t("quoteflow.builder.customer")} icon={<Building2 className="h-3.5 w-3.5" />}>
                  <Select value={customerId || "__walkin"} onValueChange={(v) => setCustomerId(v === "__walkin" ? "" : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={t("quoteflow.builder.selectCustomer")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__walkin">{t("quoteflow.builder.noCustomer")}</SelectItem>
                      {mockCustomers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label={t("quoteflow.builder.lead")} icon={<User className="h-3.5 w-3.5" />}>
                  <Select value={leadId || "__none"} onValueChange={(v) => setLeadId(v === "__none" ? "" : v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={t("quoteflow.builder.selectLead")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">{t("quoteflow.builder.noCustomer")}</SelectItem>
                      {mockLeads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}{l.company ? ` · ${l.company}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label={t("quoteflow.builder.currency")} icon={<Coins className="h-3.5 w-3.5" />}>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "RUB", "AMD", "GBP"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label={t("quoteflow.builder.validUntil")} icon={<Calendar className="h-3.5 w-3.5" />}>
                  <Input type="date" className="h-9" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </Field>

                <Field label={t("quoteflow.builder.template")} icon={<LayoutTemplate className="h-3.5 w-3.5" />}>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">{t("quoteflow.builder.noTemplate")}</SelectItem>
                      {mockTemplates.map((tp) => (
                        <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="h-3.5 w-3.5" />
                  {t("quoteflow.builder.items")}
                </h3>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("quoteflow.builder.addItem")}
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg ring-1 ring-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2 text-left">{t("quoteflow.builder.product")}</th>
                        <th className="w-16 px-2 py-2 text-right">{t("quoteflow.builder.qty")}</th>
                        <th className="w-28 px-2 py-2 text-right">{t("quoteflow.builder.unitPrice")}</th>
                        <th className="w-32 px-2 py-2 text-left">{t("quoteflow.builder.discount")}</th>
                        <th className="w-28 px-2 py-2 text-right">{t("quoteflow.builder.lineTotal")}</th>
                        <th className="w-20 px-2 py-2 text-right">{t("quoteflow.builder.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, idx) => {
                        const lineResult = calc.lines[idx];
                        return (
                          <tr key={l.uid} className="border-t border-border align-top">
                            <td className="px-2 py-2">
                              <Select value={l.productId || "__none"} onValueChange={(v) => v !== "__none" && onProductChange(l.uid, v)}>
                                <SelectTrigger className="h-9 w-full min-w-[200px]">
                                  <SelectValue placeholder={t("quoteflow.builder.product")} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none">—</SelectItem>
                                  {mockProducts.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name} · {p.sku}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {lineResult && lineResult.rulesApplied.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {lineResult.rulesApplied.map((rn) => (
                                    <Badge key={rn} variant="outline" className="text-[10px] text-cyan border-cyan/30 bg-cyan/5">
                                      {rn}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                min={0}
                                className="h-9 w-full text-right font-mono"
                                value={l.qty}
                                onChange={(e) => updateLine(l.uid, { qty: Number(e.target.value) })}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="h-9 w-full text-right font-mono"
                                value={l.unitPrice}
                                onChange={(e) => updateLine(l.uid, { unitPrice: Number(e.target.value) })}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="h-9 w-full text-right font-mono"
                                  value={l.discount}
                                  onChange={(e) => updateLine(l.uid, { discount: Number(e.target.value) })}
                                />
                                <Select
                                  value={l.discountType}
                                  onValueChange={(v) => updateLine(l.uid, { discountType: v as DiscountType })}
                                >
                                  <SelectTrigger className="h-9 w-14 px-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percent">%</SelectItem>
                                    <SelectItem value="fixed">ƒ</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right font-mono font-medium text-foreground">
                              {lineResult ? formatCurrency(lineResult.lineTotal, currency) : "—"}
                              {lineResult && lineResult.setupFee > 0 && (
                                <div className="text-[10px] text-amber">
                                  +{formatCurrency(lineResult.setupFee, currency)} setup
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  disabled={idx === 0}
                                  onClick={() => moveLine(l.uid, -1)}
                                  title={t("quoteflow.builder.moveUp")}
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  disabled={idx === lines.length - 1}
                                  onClick={() => moveLine(l.uid, 1)}
                                  title={t("quoteflow.builder.moveDown")}
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-rose hover:text-rose"
                                  onClick={() => removeLine(l.uid)}
                                  title={t("quoteflow.builder.remove")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {lines.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("quoteflow.builder.emptyItems")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pricing rules selector */}
          <Card className="surface-elevated">
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("quoteflow.builder.pricingRules")}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {mockPricingRules.map((r) => {
                  const on = selectedRuleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRule(r.id)}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors",
                        on
                          ? "border-cyan/40 bg-cyan/5"
                          : "border-border bg-card/30 hover:bg-muted/40",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ring-1",
                          on ? "bg-cyan text-background ring-cyan" : "ring-border",
                        )}
                      >
                        {on && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-foreground">{r.name}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {t(`quoteflow.rules.type.${r.type}` as const)}
                          </Badge>
                        </div>
                        {r.appliesToSku && (
                          <div className="text-xs text-muted-foreground">SKU: {r.appliesToSku}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Discount / tax / notes */}
          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t("quoteflow.builder.quoteDiscount")}>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-9 w-full font-mono"
                      value={quoteDiscountValue}
                      onChange={(e) => setQuoteDiscountValue(Number(e.target.value))}
                    />
                    <Select
                      value={quoteDiscountType}
                      onValueChange={(v) => setQuoteDiscountType(v as DiscountType)}
                    >
                      <SelectTrigger className="h-9 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">{t("quoteflow.builder.discount.type.percent")}</SelectItem>
                        <SelectItem value="fixed">{t("quoteflow.builder.discount.type.fixed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <Field label={t("quoteflow.builder.taxRate")}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className="h-9 w-full font-mono"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                  />
                </Field>
              </div>

              <Field label={t("quoteflow.builder.notes")} icon={<StickyNote className="h-3.5 w-3.5" />} className="mt-3">
                <Textarea
                  rows={3}
                  className="resize-y"
                  placeholder={t("quoteflow.builder.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — sticky totals + actions + preview */}
        <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
          <Card className="surface-elevated">
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                {t("quoteflow.builder.totals")}
              </h3>
              <dl className="space-y-2 text-sm">
                <Row label={t("quoteflow.builder.subtotal")} value={formatCurrency(calc.subtotal, currency)} />
                <Row label={t("quoteflow.builder.lineDiscounts")} value={`− ${formatCurrency(calc.lineDiscounts, currency)}`} tone="amber" />
                <Row
                  label={t("quoteflow.builder.quoteDiscountLabel")}
                  value={`− ${formatCurrency(calc.quoteDiscount, currency)}`}
                  tone="amber"
                />
                <Row
                  label={t("quoteflow.builder.totalDiscount")}
                  value={`− ${formatCurrency(calc.totalDiscount, currency)}`}
                  tone="amber"
                />
                <Separator className="my-2" />
                <Row label={t("quoteflow.builder.tax")} value={formatCurrency(calc.tax, currency)} />
                <Row
                  label={t("quoteflow.builder.grandTotal")}
                  value={formatCurrency(calc.total, currency)}
                  tone="lime"
                  big
                />
                <Separator className="my-2" />
                <Row label={t("quoteflow.builder.margin")} value={formatCurrency(calc.margin, currency)} tone="cyan" />
                <Row
                  label={t("quoteflow.builder.marginPct")}
                  value={`${calc.marginPct.toFixed(1)}%`}
                  tone="cyan"
                />
              </dl>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="surface-elevated">
            <CardContent className="p-4 space-y-2">
              <Button className="w-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={saveDraft}>
                <Save className="h-4 w-4" />
                {t("quoteflow.builder.saveDraft")}
              </Button>
              <Button variant="outline" className="w-full gap-1.5 text-cyan hover:text-cyan" onClick={requestApproval}>
                <ShieldCheck className="h-4 w-4" />
                {t("quoteflow.builder.requestApproval")}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" className="gap-1.5" onClick={generatePdf}>
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
                <Button variant="ghost" className="gap-1.5" onClick={generateDocx}>
                  <FileText className="h-4 w-4" />
                  DOCX
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live preview */}
          <Card className="surface-elevated">
            <CardContent className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("quoteflow.builder.preview")}
              </h3>
              <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono font-semibold text-foreground">
                    {previewNumber}
                  </span>
                  <Badge variant="outline" className="text-[10px]">draft</Badge>
                </div>
                <div className="text-muted-foreground">
                  <div><span className="text-foreground/70">{t("quoteflow.clientShare.to")}:</span> {customer?.name ?? lead?.company ?? lead?.name ?? t("quoteflow.builder.noCustomer")}</div>
                  <div><span className="text-foreground/70">{t("quoteflow.clientShare.valid")}:</span> {formatDate(validUntil, locale)}</div>
                  {template && (
                    <div><span className="text-foreground/70">{t("quoteflow.builder.template")}:</span> {template.name}</div>
                  )}
                </div>
                <Separator className="my-2" />
                <div className="space-y-1 font-mono">
                  {calc.lines.slice(0, 3).map((l, i) => (
                    <div key={i} className="flex justify-between text-muted-foreground">
                      <span className="truncate pr-2">
                        {l.productName || "—"} × {l.qty}
                      </span>
                      <span className="text-foreground">{formatCurrency(l.lineTotal, currency)}</span>
                    </div>
                  ))}
                  {calc.lines.length > 3 && (
                    <div className="text-muted-foreground">+{calc.lines.length - 3} more</div>
                  )}
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("quoteflow.builder.grandTotal")}</span>
                  <span className="font-mono text-sm font-bold text-lime">
                    {formatCurrency(calc.total, currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: "lime" | "cyan" | "amber" | "rose";
  big?: boolean;
}) {
  const toneText =
    tone === "lime"
      ? "text-lime"
      : tone === "cyan"
        ? "text-cyan"
        : tone === "amber"
          ? "text-amber"
          : tone === "rose"
            ? "text-rose"
            : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono font-medium", toneText, big && "text-base font-bold")}>
        {value}
      </dd>
    </div>
  );
}
