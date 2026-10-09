/** Current persistent QuoteFlow UI and its authoritative pricing engine. */

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
