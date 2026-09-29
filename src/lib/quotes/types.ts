import type { DomainContext } from "@/lib/leads/types";

export type { DomainContext };

export const QUOTE_STATUSES = [
  "draft", "pending_approval", "approved", "rejected", "sent", "accepted",
  "declined", "expired", "cancelled", "archived",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type QuoteCurrency = "AMD" | "USD" | "EUR";
export type DiscountType = "percent" | "fixed";

export interface PricedLine {
  productId: string | null;
  productName: string;
  description: string | null;
  unit: string;
  quantity: string;
  listPrice: string;
  unitPrice: string;
  discountType: DiscountType;
  discountValue: string;
  discount: string;
  quoteDiscountShare: string;
  taxRate: string;
  tax: string;
  subtotal: string;
  total: string;
  manualPriceOverride: boolean;
  priceOverrideReason: string | null;
  position: number;
}

export interface PriceResult {
  currency: QuoteCurrency;
  subtotal: string;
  lineDiscount: string;
  quoteDiscount: string;
  discount: string;
  tax: string;
  total: string;
  lines: PricedLine[];
}

export interface QuoteDto {
  id: string;
  number: string;
  leadId: string | null;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerTaxId: string | null;
  ownerId: string | null;
  status: QuoteStatus;
  currency: QuoteCurrency;
  subtotal: string;
  lineDiscount: string;
  quoteDiscount: string;
  discount: string;
  tax: string;
  total: string;
  quoteDiscountType: DiscountType;
  quoteDiscountValue: string;
  taxRate: string;
  taxIncluded: boolean;
  validUntil: string | null;
  terms: string | null;
  notes: string | null;
  revision: number;
  currentVersionNumber: number;
  currentVersionId: string | null;
  sentVersionId: string | null;
  acceptedVersionId: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<PricedLine & { id: string }>;
}
