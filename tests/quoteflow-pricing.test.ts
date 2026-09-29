import { describe, expect, test } from "bun:test";
import { calculateAuthoritativePrice } from "../src/lib/quotes/pricing";

const item = (overrides: Partial<Parameters<typeof calculateAuthoritativePrice>[0]["items"][number]> = {}) => ({
  productId: "product-1",
  productName: "Service",
  description: null,
  unit: "each",
  quantity: "2",
  listPrice: "10",
  unitPrice: "10",
  discountType: "percent" as const,
  discountValue: "10",
  position: 0,
  ...overrides,
});

describe("QuoteFlow authoritative Decimal pricing", () => {
  test("applies line discount, quote discount, and excluded tax in order", () => {
    const price = calculateAuthoritativePrice({
      currency: "USD", items: [item()], quoteDiscountType: "percent",
      quoteDiscountValue: "10", taxRate: "20", taxIncluded: false,
    });
    expect(price).toMatchObject({ subtotal: "18.00", lineDiscount: "2.00", quoteDiscount: "1.80", discount: "3.80", tax: "3.24", total: "19.44" });
  });

  test("extracts tax from tax-inclusive pricing without increasing total", () => {
    const price = calculateAuthoritativePrice({
      currency: "EUR", items: [item({ quantity: "1", unitPrice: "120", listPrice: "120", discountValue: "0" })],
      quoteDiscountType: "fixed", quoteDiscountValue: "0", taxRate: "20", taxIncluded: true,
    });
    expect(price.tax).toBe("20.00");
    expect(price.total).toBe("120.00");
  });

  test("uses ROUND_HALF_UP at money boundaries", () => {
    for (const [raw, expected] of [["0.005", "0.01"], ["1.005", "1.01"], ["19.995", "20.00"]]) {
      const price = calculateAuthoritativePrice({
        currency: "AMD", items: [item({ quantity: "1", unitPrice: raw, listPrice: raw, discountValue: "0" })],
        quoteDiscountType: "fixed", quoteDiscountValue: "0", taxRate: "0", taxIncluded: false,
      });
      expect(price.total).toBe(expected);
    }
  });

  test("allocates fixed quote discount exactly across lines", () => {
    const price = calculateAuthoritativePrice({
      currency: "USD", items: [item({ quantity: "1", discountValue: "0", position: 0 }), item({ productId: "product-2", quantity: "1", discountValue: "0", position: 1 })],
      quoteDiscountType: "fixed", quoteDiscountValue: "0.01", taxRate: "0", taxIncluded: false,
    });
    expect(price.lines.reduce((sum, line) => sum + Number(line.quoteDiscountShare), 0)).toBe(0.01);
    expect(price.total).toBe("19.99");
  });

  test("rejects invalid discounts, negative decimals, and overflow", () => {
    expect(() => calculateAuthoritativePrice({ currency: "USD", items: [item({ discountValue: "101" })], quoteDiscountType: "fixed", quoteDiscountValue: "0", taxRate: "0", taxIncluded: false })).toThrow();
    expect(() => calculateAuthoritativePrice({ currency: "USD", items: [item({ quantity: "-1" })], quoteDiscountType: "fixed", quoteDiscountValue: "0", taxRate: "0", taxIncluded: false })).toThrow();
    expect(() => calculateAuthoritativePrice({ currency: "USD", items: [item({ unitPrice: "1000000000000000" })], quoteDiscountType: "fixed", quoteDiscountValue: "0", taxRate: "0", taxIncluded: false })).toThrow();
  });
});
