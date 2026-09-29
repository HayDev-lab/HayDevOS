import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/errors";
import type { DiscountType, PriceResult, QuoteCurrency } from "./types";

export interface PricingLineInput {
  productId?: string | null;
  productName: string;
  description?: string | null;
  unit?: string;
  quantity: string;
  listPrice: string;
  unitPrice: string;
  discountType: DiscountType;
  discountValue: string;
  manualPriceOverride?: boolean;
  priceOverrideReason?: string | null;
  position: number;
}

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);
const MAX_MONEY = new Prisma.Decimal("999999999999999.9999");

function decimal(value: string, field: string): Prisma.Decimal {
  let result: Prisma.Decimal;
  try { result = new Prisma.Decimal(value); } catch { throw new ApiError(422, "INVALID_DECIMAL", `${field} is invalid`); }
  if (!result.isFinite() || result.isNegative()) throw new ApiError(422, "INVALID_DECIMAL", `${field} must be non-negative`);
  if (result.greaterThan(MAX_MONEY)) throw new ApiError(422, "DECIMAL_OVERFLOW", `${field} is too large`);
  return result;
}

function money(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function string(value: Prisma.Decimal): string { return value.toFixed(2); }

function discountAmount(base: Prisma.Decimal, type: DiscountType, raw: string, field: string): Prisma.Decimal {
  const value = decimal(raw, field);
  if (type === "percent") {
    if (value.greaterThan(HUNDRED)) throw new ApiError(422, "INVALID_DISCOUNT", `${field} cannot exceed 100 percent`);
    return money(base.times(value).dividedBy(HUNDRED));
  }
  if (value.greaterThan(base)) throw new ApiError(422, "INVALID_DISCOUNT", `${field} cannot exceed its base amount`);
  return money(value);
}

export function calculateAuthoritativePrice(input: {
  currency: QuoteCurrency;
  items: PricingLineInput[];
  quoteDiscountType: DiscountType;
  quoteDiscountValue: string;
  taxRate: string;
  taxIncluded: boolean;
}): PriceResult {
  if (input.items.length === 0) throw new ApiError(422, "QUOTE_ITEMS_REQUIRED", "At least one quote item is required");
  const taxRate = decimal(input.taxRate, "taxRate");
  if (taxRate.greaterThan(HUNDRED)) throw new ApiError(422, "INVALID_TAX_RATE", "taxRate cannot exceed 100");

  const baseLines = input.items.map((item) => {
    const quantity = decimal(item.quantity, `items.${item.position}.quantity`);
    if (quantity.isZero()) throw new ApiError(422, "INVALID_QUANTITY", "Quantity must be positive");
    const listPrice = money(decimal(item.listPrice, `items.${item.position}.listPrice`));
    const unitPrice = money(decimal(item.unitPrice, `items.${item.position}.unitPrice`));
    const gross = money(quantity.times(unitPrice));
    const discount = discountAmount(gross, item.discountType, item.discountValue, `items.${item.position}.discountValue`);
    return { item, quantity, listPrice, unitPrice, discount, subtotal: money(gross.minus(discount)) };
  });
  const subtotal = money(baseLines.reduce((sum, line) => sum.plus(line.subtotal), ZERO));
  const lineDiscount = money(baseLines.reduce((sum, line) => sum.plus(line.discount), ZERO));
  const quoteDiscount = discountAmount(subtotal, input.quoteDiscountType, input.quoteDiscountValue, "quoteDiscountValue");

  let allocated = ZERO;
  const lines = baseLines.map((line, index) => {
    const share = index === baseLines.length - 1
      ? money(quoteDiscount.minus(allocated))
      : subtotal.isZero() ? ZERO : money(quoteDiscount.times(line.subtotal).dividedBy(subtotal));
    allocated = allocated.plus(share);
    const discounted = money(line.subtotal.minus(share));
    const tax = input.taxIncluded
      ? taxRate.isZero() ? ZERO : money(discounted.minus(discounted.dividedBy(HUNDRED.plus(taxRate)).times(HUNDRED)))
      : money(discounted.times(taxRate).dividedBy(HUNDRED));
    const total = input.taxIncluded ? discounted : money(discounted.plus(tax));
    return {
      productId: line.item.productId ?? null,
      productName: line.item.productName,
      description: line.item.description ?? null,
      unit: line.item.unit ?? "each",
      quantity: line.quantity.toFixed(4),
      listPrice: string(line.listPrice),
      unitPrice: string(line.unitPrice),
      discountType: line.item.discountType,
      discountValue: decimal(line.item.discountValue, "discountValue").toFixed(4),
      discount: string(line.discount),
      quoteDiscountShare: string(share),
      taxRate: taxRate.toFixed(4),
      tax: string(tax),
      subtotal: string(line.subtotal),
      total: string(total),
      manualPriceOverride: Boolean(line.item.manualPriceOverride),
      priceOverrideReason: line.item.priceOverrideReason?.trim() || null,
      position: line.item.position,
    };
  });
  const tax = money(lines.reduce((sum, line) => sum.plus(line.tax), ZERO));
  const total = money(lines.reduce((sum, line) => sum.plus(line.total), ZERO));
  return {
    currency: input.currency,
    subtotal: string(subtotal),
    lineDiscount: string(lineDiscount),
    quoteDiscount: string(quoteDiscount),
    discount: string(lineDiscount.plus(quoteDiscount)),
    tax: string(tax),
    total: string(total),
    lines,
  };
}
