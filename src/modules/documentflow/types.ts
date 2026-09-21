/**
 * DocumentFlow AI — public type surface.
 *
 * Re-exports the DocumentFlow domain types from `data.ts` so consumers can
 * import them from a single typed entry-point. Keeping the canonical
 * definitions next to the data (in `data.ts`) avoids a circular `types ↔
 * data` split — `data.ts` already imports `DocumentStatus` / `DocumentClass`
 * from `@/lib/mock/types` and would have to import its own record types
 * back from here, which is awkward. This barrel keeps the spec's
 * "types.ts — DocumentFlow types" contract without forcing that split.
 *
 * Pipeline: Upload → Ingest → Parse/OCR → Classify → Extract → Validate →
 * Human Review → Approve → Export/Integrate → Audit.
 */

export type {
  // ─── Domain enums ────────────────────────────────────────────────────
  DocPipelineStage,
  DocType,
  OcrLang,
  FieldValidation,
  FieldReviewAction,
  JobType,
  JobStatus,
  ExportFormat,
  ExportStatus,
  SchemaFieldType,
  BatchStatus,

  // ─── Records ──────────────────────────────────────────────────────────
  DocFieldProvenance,
  DocFieldEx,
  DocVersion,
  DocRecord,
  DocBatch,
  ExtractionSchemaField,
  ExtractionSchema,
  DocJob,
  DocExport,
  DocWorker,
  DocAiProvider,
  DocOcrLangPack,
  DocMimeLimit,
  DocStorageConfig,

  // ─── Analytics ────────────────────────────────────────────────────────
  ProcessedPoint,

  // ─── Foundation re-exports (so callers only need this one module) ───
  MockDocument,
  MockDocumentField,
  DocumentStatus,
  DocumentClass,
} from "./data";
