/**
 * DocumentFlow AI module — public barrel.
 *
 * Default export: `DocumentFlowView` — the single component registered
 * in the HayDevOS module registry under the `docsmart` id.
 *
 * Pipeline: Upload → Ingest → Parse/OCR → Classify → Extract → Validate →
 * Human Review → Approve → Export/Integrate → Audit.
 *
 * Re-exports the typed domain surface from `./types` so external consumers
 * can `import { DocRecord, DocumentFlowView } from "@/modules/documentflow"`.
 */

export { DocumentFlowView } from "./DocumentFlowView";
export { DocumentFlowView as default } from "./DocumentFlowView";

export * from "./types";
