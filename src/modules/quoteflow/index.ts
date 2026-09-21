/**
 * QuoteFlow module — barrel.
 *
 * Default export: QuoteFlowView (the main module view wired into the registry).
 *
 * Task 4 wires this into the module registry by replacing
 * `placeholderFor("quoteflow")` with `QuoteFlowView` from this module.
 */

export { QuoteFlowView } from "./QuoteFlowView";
export type { QuoteFlowViewProps } from "./QuoteFlowView";

// Pricing engine (re-exported for downstream consumers / tests)
export {
  calculateLineItem,
  calculateQuote,
  applyRule,
  round2,
  summarizeCalculation,
  type DiscountType,
  type PricingRule,
  type PricingRuleType,
  type PricingTier,
  type RecurringPeriod,
  type LineItemInput,
  type LineResult,
  type PriceCalculation,
  type QuoteDiscount,
} from "./pricing";

// Data layer (re-exported for downstream consumers)
export {
  mockQuotes,
  mockProducts,
  mockLeads,
  mockCustomers,
  mockPricingRules,
  mockRulesById,
  mockPriceBooks,
  mockTemplates,
  mockApprovals,
  mockGeneratedDocuments,
  mockShareLinks,
  mockQuoteActivity,
  mockQuoteRequests,
  resolveQuoteParty,
  resolveQuoteOwner,
  quoteToLineItems,
  type PriceBook,
  type PriceBookRate,
  type QuoteTemplate,
  type ApprovalRequest,
  type ApprovalStatus,
  type GeneratedDocument,
  type GeneratedDocumentKind,
  type ClientShareLink,
  type QuoteActivity,
  type QuoteActivityType,
  type QuoteRequest,
  type QuoteRequestStatus,
} from "./data";

// Consolidated view-level types (re-exported from ./types)
export type {
  QuoteFlowTab,
  CatalogSubTab,
  BuilderSeed,
  QuoteFlowStatus,
} from "./types";
