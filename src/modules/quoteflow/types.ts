/**
 * QuoteFlow — public type surface.
 *
 * This file is the single import point for QuoteFlow domain types. It re-exports
 * the pricing-engine types (from ./pricing) and the data-layer types (from
 * ./data) so consumers can `import type { QuoteStatus, PriceCalculation, ... }`
 * from `@/modules/quoteflow` without chasing files.
 *
 * NOTE: Pricing-engine types live in `./pricing.ts` (the engine's source of
 * truth). Data-layer types live in `./data.ts`. This file only re-exports them
 * — it does not redefine them — to keep a single source of truth.
 */

// Local bindings used to compose the QuoteFlowStatus union at the bottom.
import type {
  QuoteStatus,
  QuoteRequestStatus,
  ApprovalStatus,
} from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// Pricing engine types (re-exported from ./pricing)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  DiscountType,
  PricingRuleType,
  RecurringPeriod,
  PricingTier,
  PricingRule,
  LineItemInput,
  LineResult,
  PriceCalculation,
  QuoteDiscount,
} from "./pricing";

// ─────────────────────────────────────────────────────────────────────────────
// Data-layer types (re-exported from ./data)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  // Foundation mocks re-exported through data.ts
  MockQuote,
  MockQuoteItem,
  MockProduct,
  MockLead,
  MockCustomer,
  QuoteStatus,
  // QuoteFlow-specific data layer
  PriceBook,
  PriceBookRate,
  QuoteTemplate,
  ApprovalRequest,
  ApprovalStatus,
  GeneratedDocument,
  GeneratedDocumentKind,
  ClientShareLink,
  QuoteActivity,
  QuoteActivityType,
  QuoteRequest,
  QuoteRequestStatus,
} from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// View-level types
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level QuoteFlow tab ids (matches the tab strip in QuoteFlowView). */
export type QuoteFlowTab =
  | "requests"
  | "quotes"
  | "builder"
  | "catalog"
  | "approvals"
  | "analytics"
  | "settings";

/** Sub-tab ids inside the Catalog tab. */
export type CatalogSubTab =
  | "products"
  | "pricebooks"
  | "rules"
  | "templates";

/** Seed passed to the QuoteBuilder when "Create quote from request" / "New quote" is clicked. */
export interface BuilderSeed {
  requestId?: string;
  leadId?: string;
  customerId?: string;
  products?: { productId: string; qty: number }[];
  budget?: number;
}

/** Props accepted by the top-level QuoteFlowView. */
export interface QuoteFlowViewProps {
  /** Optional initial tab (used by external triggers, e.g. dashboard quick-action). */
  initialTab?: QuoteFlowTab;
  /** Optional initial quote id to open in the builder (e.g. from a request). */
  initialQuoteId?: string;
}

/** Convenience union of every QuoteFlow status vocabulary (for badge styling helpers). */
export type QuoteFlowStatus =
  | QuoteStatus
  | QuoteRequestStatus
  | ApprovalStatus;
