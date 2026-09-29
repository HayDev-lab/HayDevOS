import "server-only";

import type { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import type { DocumentLocale, QuoteDocumentModel } from "./types";

type QuoteVersionSource = {
  id: string;
  quoteId: string;
  versionNumber: number;
  status: string;
  currency: string;
  customerSnapshot: Prisma.JsonValue;
  itemsSnapshot: Prisma.JsonValue;
  quoteSnapshot: Prisma.JsonValue;
  subtotal: { toFixed(digits: number): string };
  lineDiscount: { toFixed(digits: number): string };
  quoteDiscount: { toFixed(digits: number): string };
  tax: { toFixed(digits: number): string };
  total: { toFixed(digits: number): string };
  validUntil: Date | null;
  terms: string | null;
  notes: string | null;
  templateVersion: string;
  createdAt: Date;
};

function record(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(409, "INVALID_QUOTE_SNAPSHOT", `Quote snapshot is missing ${field}`);
  }
  return value;
}

function amount(value: unknown, fallback = "0.00"): string {
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export function buildQuoteDocumentModel(
  version: QuoteVersionSource,
  locale: DocumentLocale,
): QuoteDocumentModel {
  const customer = record(version.customerSnapshot);
  const quote = record(version.quoteSnapshot);
  const rawItems = Array.isArray(version.itemsSnapshot) ? version.itemsSnapshot : [];
  const items = rawItems.map((raw, index) => {
    const item = record(raw);
    return {
      position: typeof item.position === "number" ? item.position : index,
      name: requiredString(item.productName ?? item.name, `items[${index}].productName`),
      description: nullableString(item.description),
      unit: requiredString(item.unit, `items[${index}].unit`),
      quantity: amount(item.quantity, "1"),
      unitPrice: amount(item.unitPrice),
      discount: amount(item.discount),
      tax: amount(item.tax),
      subtotal: amount(item.subtotal),
      total: amount(item.total),
    };
  }).sort((left, right) => left.position - right.position);
  if (items.length === 0) {
    throw new ApiError(409, "INVALID_QUOTE_SNAPSHOT", "Quote snapshot has no items");
  }
  return {
    schemaVersion: "quote-document-v1",
    locale,
    quoteId: version.quoteId,
    quoteVersionId: version.id,
    quoteNumber: requiredString(quote.number, "quote number"),
    versionNumber: version.versionNumber,
    quoteStatus: version.status,
    createdAt: version.createdAt.toISOString(),
    validUntil: version.validUntil?.toISOString() ?? null,
    template: { key: "quote", version: version.templateVersion },
    customer: {
      id: nullableString(customer.id ?? customer.customerId),
      name: requiredString(customer.name, "customer name"),
      email: nullableString(customer.email),
      address: nullableString(customer.address),
      taxId: nullableString(customer.taxId),
    },
    items,
    currency: version.currency,
    subtotal: version.subtotal.toFixed(2),
    lineDiscount: version.lineDiscount.toFixed(2),
    quoteDiscount: version.quoteDiscount.toFixed(2),
    tax: version.tax.toFixed(2),
    total: version.total.toFixed(2),
    terms: version.terms,
    notes: version.notes,
  };
}
