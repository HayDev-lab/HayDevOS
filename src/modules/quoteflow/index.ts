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

// Consolidated view-level types (re-exported from ./types)
export type {
  QuoteFlowTab,
  CatalogSubTab,
  BuilderSeed,
  QuoteFlowStatus,
} from "./types";
