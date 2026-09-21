/**
 * Control module barrel.
 *
 * Default + named export: `ControlView` (the Control executive command center).
 *
 * Also re-exports the public type surface and adapter functions for downstream
 * consumers (e.g. if another module wants to embed a Control KPI card).
 */

export { ControlView, ControlView as default } from "./ControlView";

export type {
  TimeWindow,
  WindowRange,
  Priority,
  AttentionType,
  AttentionItem,
  SourceModule,
  AiInsight,
  InsightTone,
  KpiCardData,
  KpiTone,
  ModuleHealth,
  ModuleHealthEntry,
  ExecutiveSnapshot,
  SalesSummary,
  QuoteSummary,
  DocumentSummary,
  AutomationSummary,
  FinanceSummary,
  IntegrationHealthSummary,
  SlaOperationsSummary,
} from "./types";

export {
  WINDOW_OPTIONS,
  resolveWindow,
  getExecutiveSnapshot,
  getAttentionItems,
  getSalesSummary,
  getQuoteSummary,
  getDocumentSummary,
  getAutomationSummary,
  getFinanceSummary,
  getIntegrationHealth,
  getSlaOperations,
  getAiInsights,
  buildAttentionFeed,
  buildAiInsights,
  MODULE_LABELS,
  OWNER_NAMES,
  ownerName,
  WORKER_SNAPSHOT,
} from "./adapters";

export type { WorkerSnapshot } from "./adapters";

export { KpiCard, KpiCardCompact, PriorityBadge } from "./components/KpiCard";
export { EcosystemViz } from "./components/EcosystemViz";
