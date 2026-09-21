/**
 * QuoteFlow pricing engine — pure, deterministic, no eval.
 *
 * Supports:
 *   - Per-line discounts (percent | fixed)
 *   - Quote-level discount (percent | fixed)
 *   - Tax rate (%)
 *   - Margins (cost-based, optional)
 *   - Pricing rules: tiered (qty breaks), minimum price, setup fee, recurring, markup
 *
 * All monetary amounts are rounded to 2 decimals using round2().
 * The engine is intentionally side-effect-free so it can be reused
 * both client-side (live builder preview) and server-side (re-pricing on save).
 */

export type DiscountType = "percent" | "fixed";

export type PricingRuleType =
  | "tiered"
  | "minimum"
  | "setup"
  | "recurring"
  | "markup";

export type RecurringPeriod = "monthly" | "yearly";

/** A single qty-break tier. qty ≥ `qty` ⇒ unit price = `unitPrice`. */
export interface PricingTier {
  qty: number;
  unitPrice: number;
}

/** A pricing rule that can transform a line's unit price or add fees. */
export interface PricingRule {
  id: string;
  name: string;
  type: PricingRuleType;
  active: boolean;
  /** Tiered qty-break tiers, sorted asc by qty. */
  tiers?: PricingTier[];
  /** Floor on the per-unit price. */
  minPrice?: number;
  /** One-time setup fee added to the line total. */
  setupFee?: number;
  /** Recurring billing period (does not change totals — surfaced as metadata). */
  recurringPeriod?: RecurringPeriod;
  /** Markup applied on top of the unit price (% of unit price). */
  markupPct?: number;
  /** Optional product SKU the rule applies to. If omitted, applies to all. */
  appliesToSku?: string;
}

/** A line item input to the pricing engine. */
export interface LineItemInput {
  productId: string;
  productName: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  discountType: DiscountType;
  discount: number;
  /** Optional per-unit cost for margin calculations. */
  unitCost?: number;
  /** Optional rule ids applied to this line. */
  ruleIds?: string[];
}

/** Per-line calculation result. */
export interface LineResult {
  index: number;
  productId: string;
  productName: string;
  qty: number;
  listPrice: number;
  effectiveUnitPrice: number;
  discountAmount: number;
  lineDiscount: number;
  setupFee: number;
  lineTotal: number;
  /** Per-unit cost (0 if unknown). */
  unitCost: number;
  lineCost: number;
  margin: number;
  marginPct: number;
  rulesApplied: string[];
  recurring?: { period: RecurringPeriod; unitPrice: number };
}

/** Aggregated calculation result for a whole quote. */
export interface PriceCalculation {
  subtotal: number;
  lineDiscounts: number;
  quoteDiscount: number;
  totalDiscount: number;
  taxableBase: number;
  tax: number;
  total: number;
  margin: number;
  marginPct: number;
  lines: LineResult[];
  currency: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────────────────────────────────────

const ROUND = 100;

/** Round to 2 decimals. Negative-safe. */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * ROUND) / ROUND;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule application
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply a single pricing rule to a unit price / qty pair.
 * Returns the new unit price, an optional setup fee, and an optional recurring
 * descriptor. Rules are pure — they don't accumulate state.
 */
export function applyRule(
  rule: PricingRule,
  qty: number,
  unitPrice: number,
): {
  unitPrice: number;
  setupFee: number;
  recurring?: { period: RecurringPeriod; unitPrice: number };
} {
  if (!rule.active) return { unitPrice, setupFee: 0 };

  switch (rule.type) {
    case "tiered": {
      if (!rule.tiers || rule.tiers.length === 0) return { unitPrice, setupFee: 0 };
      const sorted = [...rule.tiers].sort((a, b) => a.qty - b.qty);
      let price = unitPrice;
      for (const tier of sorted) {
        if (qty >= tier.qty) price = tier.unitPrice;
      }
      return { unitPrice: round2(price), setupFee: 0 };
    }
    case "minimum": {
      if (rule.minPrice == null) return { unitPrice, setupFee: 0 };
      return { unitPrice: round2(Math.max(unitPrice, rule.minPrice)), setupFee: 0 };
    }
    case "setup": {
      return { unitPrice, setupFee: rule.setupFee ?? 0 };
    }
    case "recurring": {
      return {
        unitPrice,
        setupFee: 0,
        recurring: { period: rule.recurringPeriod ?? "monthly", unitPrice },
      };
    }
    case "markup": {
      const markup = unitPrice * ((rule.markupPct ?? 0) / 100);
      return { unitPrice: round2(unitPrice + markup), setupFee: 0 };
    }
    default:
      return { unitPrice, setupFee: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Line-item calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate a single line item.
 *
 * Sequence:
 *   1. Apply pricing rules (in declared order) to derive the effective unit price.
 *   2. Compute the gross line total (effectiveUnitPrice * qty) plus any setup fee.
 *   3. Apply the per-line discount (percent | fixed) on the gross line total.
 *   4. Compute totals + margin.
 */
export function calculateLineItem(
  qty: number,
  unitPrice: number,
  discount: number,
  discountType: DiscountType,
  rules: PricingRule[] = [],
  unitCost = 0,
): LineResult {
  const safeQty = Math.max(0, qty);
  let effectiveUnitPrice = round2(unitPrice);
  let setupFee = 0;
  let recurring: { period: RecurringPeriod; unitPrice: number } | undefined;
  const appliedNames: string[] = [];

  for (const rule of rules) {
    const result = applyRule(rule, safeQty, effectiveUnitPrice);
    if (result.unitPrice !== effectiveUnitPrice || result.setupFee > 0 || result.recurring) {
      appliedNames.push(rule.name);
    }
    effectiveUnitPrice = result.unitPrice;
    setupFee = round2(setupFee + result.setupFee);
    if (result.recurring) recurring = result.recurring;
  }

  const gross = round2(effectiveUnitPrice * safeQty);
  const grossWithSetup = round2(gross + setupFee);

  let lineDiscount = 0;
  if (discountType === "percent") {
    lineDiscount = round2(grossWithSetup * (Math.min(100, Math.max(0, discount)) / 100));
  } else {
    lineDiscount = round2(Math.min(grossWithSetup, Math.max(0, discount)));
  }

  const lineTotal = round2(grossWithSetup - lineDiscount);
  const lineCost = round2((unitCost || 0) * safeQty);
  const margin = round2(lineTotal - lineCost);
  const marginPct = lineTotal > 0 ? round2((margin / lineTotal) * 100) : 0;

  return {
    index: 0,
    productId: "",
    productName: "",
    qty: safeQty,
    listPrice: round2(unitPrice),
    effectiveUnitPrice,
    discountAmount: round2(effectiveUnitPrice - (effectiveUnitPrice * safeQty === 0 ? 0 : effectiveUnitPrice)),
    lineDiscount,
    setupFee,
    lineTotal,
    unitCost: unitCost || 0,
    lineCost,
    margin,
    marginPct,
    rulesApplied: appliedNames,
    recurring,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quote-level calculation
// ─────────────────────────────────────────────────────────────────────────────

export interface QuoteDiscount {
  type: DiscountType;
  value: number;
}

/**
 * Calculate the full quote.
 *
 * Per the QuoteFlow contract, the public signature is:
 *   `calculateQuote(items, quoteDiscount, taxRate, cost?)`
 * where `cost` is an optional fallback per-unit cost applied to any line item
 * that doesn't carry its own `unitCost`. The engine also accepts two optional
 * trailing parameters — `currency` and `rulesById` — that the builder uses to
 * carry currency through to the result and to resolve per-line pricing rules.
 *
 * @param items line item inputs
 * @param quoteDiscount quote-level discount (defaults to {percent, 0})
 * @param taxRate tax rate as percent (e.g. 20 = 20%)
 * @param cost optional fallback per-unit cost (applied to items without `unitCost`)
 * @param currency ISO code (carried through to the result, defaults to USD)
 * @param rulesById rule lookup map for per-line rule resolution
 */
export function calculateQuote(
  items: LineItemInput[],
  quoteDiscount: QuoteDiscount = { type: "percent", value: 0 },
  taxRate = 0,
  cost?: number,
  currency = "USD",
  rulesById: Record<string, PricingRule> = {},
): PriceCalculation {
  const lines: LineResult[] = items.map((item, idx) => {
    const rules = (item.ruleIds ?? [])
      .map((id) => rulesById[id])
      .filter((r): r is PricingRule => Boolean(r));
    // Use the item's own unitCost if provided; otherwise fall back to the
    // optional `cost` parameter; otherwise 0 (unknown cost).
    const effectiveCost =
      typeof item.unitCost === "number" && item.unitCost > 0
        ? item.unitCost
        : typeof cost === "number" && cost > 0
          ? cost
          : 0;
    const line = calculateLineItem(
      item.qty,
      item.unitPrice,
      item.discount,
      item.discountType,
      rules,
      effectiveCost,
    );
    return {
      ...line,
      index: idx,
      productId: item.productId,
      productName: item.productName,
    };
  });

  // Subtotal = sum of line totals (after line discounts, after rule repricing)
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

  // Line discounts aggregated (for visibility)
  const lineDiscounts = round2(lines.reduce((s, l) => s + l.lineDiscount, 0));

  // Quote-level discount applied on the post-line subtotal
  let quoteDiscountAmount = 0;
  if (quoteDiscount.type === "percent") {
    quoteDiscountAmount = round2(
      subtotal * (Math.min(100, Math.max(0, quoteDiscount.value)) / 100),
    );
  } else {
    quoteDiscountAmount = round2(Math.min(subtotal, Math.max(0, quoteDiscount.value)));
  }

  const totalDiscount = round2(lineDiscounts + quoteDiscountAmount);
  const taxableBase = round2(subtotal - quoteDiscountAmount);
  const tax = round2(taxableBase * (Math.max(0, taxRate) / 100));
  const total = round2(taxableBase + tax);

  const margin = round2(lines.reduce((s, l) => s + l.margin, 0));
  const marginPct = total > 0 ? round2((margin / total) * 100) : 0;

  return {
    subtotal,
    lineDiscounts,
    quoteDiscount: quoteDiscountAmount,
    totalDiscount,
    taxableBase,
    tax,
    total,
    margin,
    marginPct,
    lines,
    currency,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: format a calculation result for display.
// ─────────────────────────────────────────────────────────────────────────────

export function summarizeCalculation(calc: PriceCalculation): string {
  return [
    `Subtotal ${calc.subtotal.toFixed(2)}`,
    `Discount ${calc.totalDiscount.toFixed(2)}`,
    `Tax ${calc.tax.toFixed(2)}`,
    `Total ${calc.total.toFixed(2)}`,
  ].join(" · ");
}
