/**
 * DocumentFlow AI — extended mock data.
 *
 * Re-exports the foundation document mocks and adds DocumentFlow-specific
 * extensions: rich provenance-bearing fields, pipeline stage tracking,
 * batches, extraction schemas, durable jobs, exports, analytics, and the
 * AI provider / OCR / storage config.
 *
 * Everything is in-memory (no DB round-trip). Pipeline progression is
 * simulated in the UI via setTimeout — see `useDocFlow` in DocumentFlowView.
 */

// Re-export the foundation document mocks so consumers can reach them through
// this single barrel if desired.
export { mockDocuments } from "@/lib/mock/documents";
export type {
  MockDocument,
  MockDocumentField,
  DocumentStatus,
  DocumentClass,
} from "@/lib/mock/types";

import type {
  DocumentStatus,
  DocumentClass,
} from "@/lib/mock/types";

// ─────────────────────────────────────────────────────────────────────────────
// Domain enums
// ─────────────────────────────────────────────────────────────────────────────

export type DocPipelineStage =
  | "ingest"
  | "parse"
  | "ocr"
  | "classify"
  | "extract"
  | "validate"
  | "review"
  | "export";

export type DocType = "pdf" | "docx" | "xlsx" | "csv" | "txt" | "png" | "jpg";

export type OcrLang = "hy" | "ru" | "en";

export type FieldValidation = "valid" | "warning" | "invalid" | "missing";

export type FieldReviewAction = "accept" | "correct" | "reject" | "not_found";

export type JobType =
  | "parse"
  | "ocr"
  | "classify"
  | "extract"
  | "validate"
  | "export";

export type JobStatus = "queued" | "running" | "success" | "failed" | "retrying";

export type ExportFormat =
  | "csv"
  | "json"
  | "erp_quickbooks"
  | "erp_sap"
  | "erp_dynamics";

export type ExportStatus = "queued" | "running" | "success" | "failed";

export type SchemaFieldType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "currency"
  | "email"
  | "phone";

export type BatchStatus =
  | "uploading"
  | "processing"
  | "review"
  | "completed"
  | "failed";

// ─────────────────────────────────────────────────────────────────────────────
// Records
// ─────────────────────────────────────────────────────────────────────────────

export interface DocFieldProvenance {
  page: number;
  excerpt: string;
  offsets: [number, number]; // [start, end] character offsets within the page
}

export interface DocFieldEx {
  key: string;
  value: string;
  confidence: number; // 0..1
  reviewed: boolean;
  validation: FieldValidation;
  provenance: DocFieldProvenance;
  reviewAction?: FieldReviewAction | null;
  correctedValue?: string | null;
}

export interface DocVersion {
  version: number;
  editedAt: string;
  editedBy: string;
  note: string;
}

export interface DocRecord {
  id: string;
  orgId: string;
  filename: string;
  mime: string;
  type: DocType;
  size: number;
  status: DocumentStatus;
  stage: DocPipelineStage;
  progressPct: number; // 0..100
  uploadedById: string;
  uploadedByName: string;
  batchId: string | null;
  classification: DocumentClass | null;
  confidence: number | null; // overall classification confidence
  ocrLang: OcrLang | null;
  pages: number;
  version: number;
  versions: DocVersion[];
  fields: DocFieldEx[];
  createdAt: string;
  updatedAt: string;
}

export interface DocBatch {
  id: string;
  orgId: string;
  name: string;
  status: BatchStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
  docIds: string[];
}

export interface ExtractionSchemaField {
  key: string;
  type: SchemaFieldType;
  required: boolean;
  validation?: string; // human-readable validation rule
}

export interface ExtractionSchema {
  id: string;
  orgId: string;
  name: string;
  classifications: DocumentClass[];
  fields: ExtractionSchemaField[];
  createdAt: string;
  updatedAt: string;
}

export interface DocJob {
  id: string;
  orgId: string;
  type: JobType;
  status: JobStatus;
  documentId: string;
  documentName: string;
  worker: string; // e.g. "worker-3"
  startedAt: string;
  durationMs: number;
  retries: number;
}

export interface DocExport {
  id: string;
  orgId: string;
  target: string; // e.g. "QuickBooks Online", "Data lake (S3)"
  format: ExportFormat;
  records: number;
  status: ExportStatus;
  createdAt: string;
  createdByName: string;
}

export interface DocWorker {
  id: string;
  status: "idle" | "busy";
  currentJob?: string;
}

export interface DocAiProvider {
  id: string;
  name: string;
  endpoint: string;
  model: string;
  apiKeyMasked: string;
  enabled: boolean;
}

export interface DocOcrLangPack {
  code: OcrLang;
  name: string;
  enabled: boolean;
}

export interface DocMimeLimit {
  mime: string;
  type: DocType;
  maxSizeMb: number;
  enabled: boolean;
}

export interface DocStorageConfig {
  bucket: string;
  region: string;
  endpoint: string;
  encryption: "AES-256" | "SSE-KMS";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ORG = "org_haydev";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

export function typeFromMime(mime: string): DocType {
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("wordprocessing")) return "docx";
  if (mime.includes("spreadsheet")) return "xlsx";
  if (mime === "text/csv" || mime === "application/csv") return "csv";
  if (mime === "text/plain") return "txt";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  return "txt";
}

/** A best-effort faux page excerpt used in the simulated document preview. */
export function fauxExcerptFor(rec: Pick<DocRecord, "filename" | "classification" | "type">): string {
  const cls = rec.classification ?? "other";
  const head = `// ${rec.filename} · ${cls.toUpperCase()} · ${rec.type.toUpperCase()}\n`;
  switch (cls) {
    case "invoice":
      return (
        head +
        "INVOICE\n\nFrom: ACME Supplies LLC\nBill to: HayDev HQ LLC\nInvoice #: INV-2841\nDate: 2026-09-12\nDue: 2026-10-15\n\nLine items:\n  1. Enterprise license (annual) ........ $9,800.00\n  2. Premium support tier .............. $1,680.00\n  3. Onboarding & training ............. $1,000.00\n\nSubtotal: $12,480.00\nTax (0%): $0.00\nTOTAL DUE: $12,480.00\n\nRemit to: accounts@acme-supplies.example"
      );
    case "contract":
      return (
        head +
        "MASTER SERVICES AGREEMENT\n\nThis Agreement is entered into as of 2026-09-01 by and between\nVortex Labs LLC (\"Contractor\") and HayDev HQ LLC (\"Customer\").\n\n1. TERM. This Agreement shall commence on the Effective Date and\n   continue for an initial term of twenty-four (24) months.\n2. AUTO-RENEWAL. The Agreement shall automatically renew for\n   successive twelve (12) month periods unless either party gives\n   written notice of non-renewal at least sixty (60) days prior.\n3. FEES. Customer shall pay Contractor the fees set forth in Exhibit A.\n\nIN WITNESS WHEREOF, the parties have executed this Agreement.\n\n_________________________   _________________________\nLilit Avetisyan              Aram Hayrapetyan"
      );
    case "receipt":
      return (
        head +
        "Yandex Taxi — Trip Receipt\n\nDate: 2026-09-20 19:42\nDriver: R. Mkrtchyan\nVehicle: 99 AX 441\n\nFrom: Yerevan, Amiryan 5\nTo:   Yerevan, Baghramyan 18\nDistance: 4.2 km\nDuration: 14 min\n\nFare: 1,480 RUB\nTip: 0 RUB\nTotal: 1,480 RUB\n\nPaid by card •••• 4291"
      );
    case "id":
      return (
        head +
        "REPUBLIC OF ARMENIA — PASSPORT\nPassport No. AM 4 8291 0042\nSurname: GHAZARYAN\nGiven names: ANNA\nNationality: ARMENIAN\nDate of birth: 14.03.1991\nSex: F\nPlace of birth: YEREVAN\nDate of issue: 22.06.2021\nDate of expiry: 21.06.2031\nAuthority: MFA OF ARMENIA"
      );
    case "form":
      return (
        head +
        "BANK STATEMENT — Electric Networks of Armenia\nAccount holder: HayDev HQ LLC\nAccount: AM47 2050 0000 1829 4410 100\nPeriod: 2026-08-01 to 2026-08-31\n\nOpening balance:  842,090.55 AMD\nDeposits:            0.00 AMD\nWithdrawals:    -42,910.55 AMD\nClosing balance: 799,180.00 AMD"
      );
    default:
      return (
        head +
        "Document preview\n\nThis is a simulated text rendering of the document body.\nIn production this panel would render the actual parsed page\ncontent returned by the OCR / parse worker."
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents — 14 records spanning every status, type and classification
// ─────────────────────────────────────────────────────────────────────────────

export const docflowDocuments: DocRecord[] = [
  {
    id: "dc_001",
    orgId: ORG,
    filename: "invoice_ACME_2841.pdf",
    mime: "application/pdf",
    type: "pdf",
    size: 248_320,
    status: "approved",
    stage: "export",
    progressPct: 100,
    uploadedById: "usr_owner",
    uploadedByName: "Aram Hayrapetyan",
    batchId: "bt_001",
    classification: "invoice",
    confidence: 0.98,
    ocrLang: null,
    pages: 2,
    version: 3,
    versions: [
      { version: 1, editedAt: daysAgo(2), editedBy: "AI Extractor", note: "Initial extraction" },
      { version: 2, editedAt: daysAgo(2), editedBy: "Aram Hayrapetyan", note: "Corrected vendor name" },
      { version: 3, editedAt: daysAgo(1), editedBy: "Aram Hayrapetyan", note: "Approved for export" },
    ],
    fields: [
      { key: "vendor", value: "ACME Supplies", confidence: 0.98, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "From: ACME Supplies LLC", offsets: [6, 24] }, reviewAction: "accept" },
      { key: "invoice_number", value: "INV-2841", confidence: 0.99, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "Invoice #: INV-2841", offsets: [12, 20] }, reviewAction: "accept" },
      { key: "total", value: "$12,480.00", confidence: 0.97, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "TOTAL DUE: $12,480.00", offsets: [12, 23] }, reviewAction: "accept" },
      { key: "due_date", value: "2026-10-15", confidence: 0.94, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "Due: 2026-10-15", offsets: [5, 15] }, reviewAction: "accept" },
    ],
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  {
    id: "dc_002",
    orgId: ORG,
    filename: "contract_vortex_v3.docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: "docx",
    size: 542_210,
    status: "reviewed",
    stage: "review",
    progressPct: 88,
    uploadedById: "usr_rep1",
    uploadedByName: "Lilit Avetisyan",
    batchId: "bt_002",
    classification: "contract",
    confidence: 0.96,
    ocrLang: null,
    pages: 9,
    version: 2,
    versions: [
      { version: 1, editedAt: daysAgo(4), editedBy: "AI Extractor", note: "Initial extraction" },
      { version: 2, editedAt: daysAgo(3), editedBy: "Lilit Avetisyan", note: "Reviewed all fields" },
    ],
    fields: [
      { key: "counterparty", value: "Vortex Labs LLC", confidence: 0.96, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "Vortex Labs LLC (\"Contractor\")", offsets: [0, 16] }, reviewAction: "accept" },
      { key: "effective_date", value: "2026-09-01", confidence: 0.92, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "as of 2026-09-01", offsets: [6, 16] }, reviewAction: "accept" },
      { key: "term_months", value: "24", confidence: 0.88, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "twenty-four (24) months", offsets: [16, 18] }, reviewAction: "accept" },
      { key: "auto_renewal", value: "true", confidence: 0.71, reviewed: false, validation: "warning", provenance: { page: 1, excerpt: "shall automatically renew", offsets: [0, 25] } },
    ],
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },
  {
    id: "dc_003",
    orgId: ORG,
    filename: "receipt_taxi_0921.jpg",
    mime: "image/jpeg",
    type: "jpg",
    size: 88_410,
    status: "extracted",
    stage: "validate",
    progressPct: 70,
    uploadedById: "usr_rep2",
    uploadedByName: "Anna Petrosyan",
    batchId: "bt_003",
    classification: "receipt",
    confidence: 0.81,
    ocrLang: "ru",
    pages: 1,
    version: 1,
    versions: [
      { version: 1, editedAt: hoursAgo(8), editedBy: "AI Extractor", note: "Initial OCR extraction (ru)" },
    ],
    fields: [
      { key: "merchant", value: "Yandex Taxi", confidence: 0.84, reviewed: false, validation: "warning", provenance: { page: 1, excerpt: "Yandex Taxi — Trip Receipt", offsets: [0, 11] } },
      { key: "amount", value: "1,480 RUB", confidence: 0.79, reviewed: false, validation: "warning", provenance: { page: 1, excerpt: "Total: 1,480 RUB", offsets: [7, 16] } },
      { key: "date", value: "2026-09-20", confidence: 0.81, reviewed: false, validation: "valid", provenance: { page: 1, excerpt: "Date: 2026-09-20 19:42", offsets: [6, 16] } },
    ],
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(7),
  },
  {
    id: "dc_004",
    orgId: ORG,
    filename: "passport_ghazaryan.pdf",
    mime: "application/pdf",
    type: "pdf",
    size: 412_980,
    status: "classified",
    stage: "extract",
    progressPct: 55,
    uploadedById: "usr_owner",
    uploadedByName: "Aram Hayrapetyan",
    batchId: null,
    classification: "id",
    confidence: 0.91,
    ocrLang: "hy",
    pages: 1,
    version: 1,
    versions: [
      { version: 1, editedAt: hoursAgo(3), editedBy: "AI Classifier", note: "Classified as ID document" },
    ],
    fields: [
      { key: "type", value: "Passport (AM)", confidence: 0.91, reviewed: false, validation: "valid", provenance: { page: 1, excerpt: "REPUBLIC OF ARMENIA — PASSPORT", offsets: [0, 30] } },
    ],
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(2),
  },
  {
    id: "dc_005",
    orgId: ORG,
    filename: "w9_form_jane.pdf",
    mime: "application/pdf",
    type: "pdf",
    size: 156_770,
    status: "processing",
    stage: "ocr",
    progressPct: 30,
    uploadedById: "usr_rep1",
    uploadedByName: "Lilit Avetisyan",
    batchId: "bt_004",
    classification: null,
    confidence: null,
    ocrLang: "en",
    pages: 1,
    version: 1,
    versions: [
      { version: 1, editedAt: hoursAgo(1), editedBy: "Ingest", note: "Uploaded" },
    ],
    fields: [],
    createdAt: hoursAgo(1),
    updatedAt: minsAgo(50),
  },
  {
    id: "dc_006",
    orgId: ORG,
    filename: "bank_statement_aug.pdf",
    mime: "application/pdf",
    type: "pdf",
    size: 1_842_330,
    status: "extracted",
    stage: "validate",
    progressPct: 72,
    uploadedById: "usr_owner",
    uploadedByName: "Aram Hayrapetyan",
    batchId: "bt_005",
    classification: "form",
    confidence: 0.87,
    ocrLang: "en",
    pages: 6,
    version: 1,
    versions: [
      { version: 1, editedAt: daysAgo(1), editedBy: "AI Extractor", note: "Initial extraction" },
    ],
    fields: [
      { key: "account_holder", value: "HayDev HQ LLC", confidence: 0.93, reviewed: false, validation: "valid", provenance: { page: 1, excerpt: "Account holder: HayDev HQ LLC", offsets: [17, 30] } },
      { key: "period", value: "2026-08-01 → 2026-08-31", confidence: 0.9, reviewed: false, validation: "valid", provenance: { page: 1, excerpt: "Period: 2026-08-01 to 2026-08-31", offsets: [8, 32] } },
      { key: "closing_balance", value: "$842,910.55", confidence: 0.86, reviewed: false, validation: "warning", provenance: { page: 1, excerpt: "Closing balance: 799,180.00 AMD", offsets: [17, 30] } },
    ],
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(20),
  },
  {
    id: "dc_007",
    orgId: ORG,
    filename: "quote_signed_brightpath.pdf",
    mime: "application/pdf",
    type: "pdf",
    size: 312_400,
    status: "approved",
    stage: "export",
    progressPct: 100,
    uploadedById: "usr_rep1",
    uploadedByName: "Lilit Avetisyan",
    batchId: null,
    classification: "contract",
    confidence: 0.97,
    ocrLang: "en",
    pages: 3,
    version: 2,
    versions: [
      { version: 1, editedAt: daysAgo(7), editedBy: "AI Extractor", note: "Initial extraction" },
      { version: 2, editedAt: daysAgo(6), editedBy: "Aram Hayrapetyan", note: "Approved — e-signed" },
    ],
    fields: [
      { key: "signer", value: "Lilit Avetisyan", confidence: 0.97, reviewed: true, validation: "valid", provenance: { page: 3, excerpt: "Lilit Avetisyan", offsets: [0, 15] }, reviewAction: "accept" },
      { key: "signed_at", value: "2026-09-15T14:22:00Z", confidence: 0.95, reviewed: true, validation: "valid", provenance: { page: 3, excerpt: "Signed at: 2026-09-15 14:22 UTC", offsets: [11, 31] }, reviewAction: "accept" },
    ],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
  },
  {
    id: "dc_008",
    orgId: ORG,
    filename: "purchase_order_helix.xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    type: "xlsx",
    size: 96_120,
    status: "rejected",
    stage: "review",
    progressPct: 90,
    uploadedById: "usr_rep2",
    uploadedByName: "Anna Petrosyan",
    batchId: null,
    classification: "form",
    confidence: 0.9,
    ocrLang: null,
    pages: 1,
    version: 2,
    versions: [
      { version: 1, editedAt: daysAgo(10), editedBy: "AI Extractor", note: "Initial extraction" },
      { version: 2, editedAt: daysAgo(9), editedBy: "Aram Hayrapetyan", note: "Rejected — duplicate" },
    ],
    fields: [
      { key: "po_number", value: "PO-9921", confidence: 0.9, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "PO # PO-9921", offsets: [5, 12] }, reviewAction: "accept" },
      { key: "reject_reason", value: "Duplicate of PO-9918", confidence: 1, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "Rejected: duplicate of PO-9918", offsets: [10, 30] }, reviewAction: "accept" },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(9),
  },
  {
    id: "dc_009",
    orgId: ORG,
    filename: "nda_meridian.pdf",
    mime: "application/pdf",
    type: "pdf",
    size: 198_000,
    status: "pending",
    stage: "ingest",
    progressPct: 8,
    uploadedById: "usr_owner",
    uploadedByName: "Aram Hayrapetyan",
    batchId: "bt_006",
    classification: null,
    confidence: null,
    ocrLang: null,
    pages: 0,
    version: 1,
    versions: [
      { version: 1, editedAt: minsAgo(12), editedBy: "Ingest", note: "Uploaded" },
    ],
    fields: [],
    createdAt: minsAgo(12),
    updatedAt: minsAgo(12),
  },
  {
    id: "dc_010",
    orgId: ORG,
    filename: "employment_contract_2026.docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: "docx",
    size: 421_880,
    status: "classified",
    stage: "extract",
    progressPct: 48,
    uploadedById: "usr_owner",
    uploadedByName: "Aram Hayrapetyan",
    batchId: null,
    classification: "contract",
    confidence: 0.94,
    ocrLang: "hy",
    pages: 5,
    version: 1,
    versions: [
      { version: 1, editedAt: daysAgo(3), editedBy: "AI Classifier", note: "Classified as contract" },
    ],
    fields: [
      { key: "employee", value: "Anna Petrosyan", confidence: 0.94, reviewed: false, validation: "valid", provenance: { page: 1, excerpt: "Employee: Anna Petrosyan", offsets: [11, 25] } },
      { key: "start_date", value: "2026-10-01", confidence: 0.89, reviewed: false, validation: "valid", provenance: { page: 1, excerpt: "Start date: 2026-10-01", offsets: [12, 22] } },
    ],
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  {
    id: "dc_011",
    orgId: ORG,
    filename: "utility_bill_sept.pdf",
    mime: "application/pdf",
    type: "pdf",
    size: 142_330,
    status: "extracted",
    stage: "validate",
    progressPct: 68,
    uploadedById: "usr_rep2",
    uploadedByName: "Anna Petrosyan",
    batchId: "bt_007",
    classification: "receipt",
    confidence: 0.85,
    ocrLang: "hy",
    pages: 2,
    version: 1,
    versions: [
      { version: 1, editedAt: hoursAgo(12), editedBy: "AI Extractor", note: "Initial OCR extraction (hy)" },
    ],
    fields: [
      { key: "provider", value: "Electric Networks of Armenia", confidence: 0.87, reviewed: false, validation: "valid", provenance: { page: 1, excerpt: "Electric Networks of Armenia", offsets: [0, 28] } },
      { key: "amount", value: "84,200 AMD", confidence: 0.83, reviewed: false, validation: "warning", provenance: { page: 1, excerpt: "Closing balance: 799,180.00 AMD", offsets: [17, 30] } },
    ],
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(11),
  },
  {
    id: "dc_012",
    orgId: ORG,
    filename: "msa_master_v4.pdf",
    mime: "application/pdf",
    type: "pdf",
    size: 921_440,
    status: "approved",
    stage: "export",
    progressPct: 100,
    uploadedById: "usr_owner",
    uploadedByName: "Aram Hayrapetyan",
    batchId: null,
    classification: "contract",
    confidence: 0.99,
    ocrLang: "en",
    pages: 24,
    version: 4,
    versions: [
      { version: 1, editedAt: daysAgo(15), editedBy: "AI Extractor", note: "Initial extraction" },
      { version: 2, editedAt: daysAgo(14), editedBy: "Aram Hayrapetyan", note: "Title corrected" },
      { version: 3, editedAt: daysAgo(13), editedBy: "Legal team", note: "Validated clauses" },
      { version: 4, editedAt: daysAgo(12), editedBy: "Aram Hayrapetyan", note: "Approved — v4" },
    ],
    fields: [
      { key: "title", value: "Master Services Agreement", confidence: 0.99, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "MASTER SERVICES AGREEMENT", offsets: [0, 25] }, reviewAction: "accept" },
      { key: "version", value: "4.0", confidence: 0.98, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "v4.0", offsets: [1, 4] }, reviewAction: "accept" },
    ],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(12),
  },
  {
    id: "dc_013",
    orgId: ORG,
    filename: "leads_export_q3.csv",
    mime: "text/csv",
    type: "csv",
    size: 18_440,
    status: "reviewed",
    stage: "review",
    progressPct: 86,
    uploadedById: "usr_rep1",
    uploadedByName: "Lilit Avetisyan",
    batchId: null,
    classification: "other",
    confidence: 0.76,
    ocrLang: null,
    pages: 1,
    version: 1,
    versions: [
      { version: 1, editedAt: hoursAgo(5), editedBy: "AI Extractor", note: "CSV parsed — 84 rows" },
    ],
    fields: [
      { key: "row_count", value: "84", confidence: 0.99, reviewed: true, validation: "valid", provenance: { page: 1, excerpt: "rows=84", offsets: [5, 7] }, reviewAction: "accept" },
      { key: "period", value: "2026-Q3", confidence: 0.62, reviewed: false, validation: "warning", provenance: { page: 1, excerpt: "Q3 2026 leads export", offsets: [0, 19] } },
    ],
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(4),
  },
  {
    id: "dc_014",
    orgId: ORG,
    filename: "scan_signed_quote_brightpath.png",
    mime: "image/png",
    type: "png",
    size: 2_104_880,
    status: "processing",
    stage: "parse",
    progressPct: 22,
    uploadedById: "usr_rep2",
    uploadedByName: "Anna Petrosyan",
    batchId: "bt_007",
    classification: null,
    confidence: null,
    ocrLang: "en",
    pages: 1,
    version: 1,
    versions: [
      { version: 1, editedAt: minsAgo(40), editedBy: "Ingest", note: "Uploaded (scan)" },
    ],
    fields: [],
    createdAt: minsAgo(40),
    updatedAt: minsAgo(35),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Batches
// ─────────────────────────────────────────────────────────────────────────────

export const docflowBatches: DocBatch[] = [
  {
    id: "bt_001",
    orgId: ORG,
    name: "ACME invoices — September",
    status: "completed",
    createdById: "usr_owner",
    createdByName: "Aram Hayrapetyan",
    createdAt: daysAgo(2),
    docIds: ["dc_001"],
  },
  {
    id: "bt_002",
    orgId: ORG,
    name: "Vortex contract package",
    status: "review",
    createdById: "usr_rep1",
    createdByName: "Lilit Avetisyan",
    createdAt: daysAgo(4),
    docIds: ["dc_002"],
  },
  {
    id: "bt_003",
    orgId: ORG,
    name: "Mobile receipts — Sept 20",
    status: "processing",
    createdById: "usr_rep2",
    createdByName: "Anna Petrosyan",
    createdAt: hoursAgo(8),
    docIds: ["dc_003"],
  },
  {
    id: "bt_004",
    orgId: ORG,
    name: "Tax forms (W-9 / 1099)",
    status: "processing",
    createdById: "usr_rep1",
    createdByName: "Lilit Avetisyan",
    createdAt: hoursAgo(1),
    docIds: ["dc_005"],
  },
  {
    id: "bt_005",
    orgId: ORG,
    name: "Bank statements — August",
    status: "review",
    createdById: "usr_owner",
    createdByName: "Aram Hayrapetyan",
    createdAt: daysAgo(1),
    docIds: ["dc_006"],
  },
  {
    id: "bt_006",
    orgId: ORG,
    name: "Legal — NDAs",
    status: "uploading",
    createdById: "usr_owner",
    createdByName: "Aram Hayrapetyan",
    createdAt: minsAgo(12),
    docIds: ["dc_009"],
  },
  {
    id: "bt_007",
    orgId: ORG,
    name: "Utility & signed scans",
    status: "processing",
    createdById: "usr_rep2",
    createdByName: "Anna Petrosyan",
    createdAt: hoursAgo(12),
    docIds: ["dc_011", "dc_014"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Extraction schemas
// ─────────────────────────────────────────────────────────────────────────────

export const docflowSchemas: ExtractionSchema[] = [
  {
    id: "sc_invoice",
    orgId: ORG,
    name: "Invoice",
    classifications: ["invoice"],
    fields: [
      { key: "vendor", type: "string", required: true, validation: "non-empty" },
      { key: "invoice_number", type: "string", required: true, validation: "regex ^INV-\\d+$" },
      { key: "issue_date", type: "date", required: true, validation: "ISO 8601" },
      { key: "due_date", type: "date", required: false, validation: "after issue_date" },
      { key: "subtotal", type: "currency", required: true, validation: "> 0" },
      { key: "tax", type: "currency", required: false, validation: ">= 0" },
      { key: "total", type: "currency", required: true, validation: "= subtotal + tax" },
      { key: "currency", type: "string", required: true, validation: "ISO 4217" },
    ],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(5),
  },
  {
    id: "sc_contract",
    orgId: ORG,
    name: "Contract",
    classifications: ["contract"],
    fields: [
      { key: "title", type: "string", required: true, validation: "non-empty" },
      { key: "counterparty", type: "string", required: true, validation: "non-empty" },
      { key: "effective_date", type: "date", required: true, validation: "ISO 8601" },
      { key: "term_months", type: "number", required: false, validation: "1..120" },
      { key: "auto_renewal", type: "boolean", required: false, validation: "boolean" },
      { key: "signer", type: "string", required: true, validation: "non-empty" },
      { key: "signed_at", type: "date", required: true, validation: "ISO 8601 datetime" },
    ],
    createdAt: daysAgo(28),
    updatedAt: daysAgo(2),
  },
  {
    id: "sc_receipt",
    orgId: ORG,
    name: "Receipt",
    classifications: ["receipt"],
    fields: [
      { key: "merchant", type: "string", required: true, validation: "non-empty" },
      { key: "amount", type: "currency", required: true, validation: "> 0" },
      { key: "date", type: "date", required: true, validation: "ISO 8601" },
      { key: "category", type: "string", required: false, validation: "enum: travel,meals,office,other" },
    ],
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },
  {
    id: "sc_id",
    orgId: ORG,
    name: "ID document",
    classifications: ["id"],
    fields: [
      { key: "type", type: "string", required: true, validation: "enum: passport,driver_license,national_id" },
      { key: "surname", type: "string", required: true, validation: "non-empty" },
      { key: "given_names", type: "string", required: true, validation: "non-empty" },
      { key: "date_of_birth", type: "date", required: true, validation: "ISO 8601" },
      { key: "document_number", type: "string", required: true, validation: "non-empty" },
      { key: "expiry_date", type: "date", required: true, validation: "future" },
    ],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(3),
  },
  {
    id: "sc_custom",
    orgId: ORG,
    name: "Custom — Bank statement",
    classifications: ["form", "other"],
    fields: [
      { key: "account_holder", type: "string", required: true, validation: "non-empty" },
      { key: "period", type: "string", required: true, validation: "non-empty" },
      { key: "opening_balance", type: "currency", required: false, validation: "number" },
      { key: "closing_balance", type: "currency", required: true, validation: "number" },
    ],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(4),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Jobs + worker pool
// ─────────────────────────────────────────────────────────────────────────────

export const docflowWorkers: DocWorker[] = [
  { id: "worker-1", status: "busy", currentJob: "job_018" },
  { id: "worker-2", status: "busy", currentJob: "job_019" },
  { id: "worker-3", status: "idle" },
  { id: "worker-4", status: "busy", currentJob: "job_020" },
  { id: "worker-5", status: "idle" },
  { id: "worker-6", status: "busy", currentJob: "job_021" },
];

export const docflowJobs: DocJob[] = [
  { id: "job_001", orgId: ORG, type: "parse", status: "success", documentId: "dc_001", documentName: "invoice_ACME_2841.pdf", worker: "worker-1", startedAt: daysAgo(2), durationMs: 4120, retries: 0 },
  { id: "job_002", orgId: ORG, type: "ocr", status: "success", documentId: "dc_001", documentName: "invoice_ACME_2841.pdf", worker: "worker-2", startedAt: daysAgo(2), durationMs: 9840, retries: 0 },
  { id: "job_003", orgId: ORG, type: "classify", status: "success", documentId: "dc_001", documentName: "invoice_ACME_2841.pdf", worker: "worker-1", startedAt: daysAgo(2), durationMs: 1340, retries: 0 },
  { id: "job_004", orgId: ORG, type: "extract", status: "success", documentId: "dc_001", documentName: "invoice_ACME_2841.pdf", worker: "worker-3", startedAt: daysAgo(2), durationMs: 6220, retries: 0 },
  { id: "job_005", orgId: ORG, type: "parse", status: "success", documentId: "dc_002", documentName: "contract_vortex_v3.docx", worker: "worker-2", startedAt: daysAgo(4), durationMs: 3180, retries: 0 },
  { id: "job_006", orgId: ORG, type: "extract", status: "success", documentId: "dc_002", documentName: "contract_vortex_v3.docx", worker: "worker-4", startedAt: daysAgo(4), durationMs: 7810, retries: 0 },
  { id: "job_007", orgId: ORG, type: "ocr", status: "success", documentId: "dc_003", documentName: "receipt_taxi_0921.jpg", worker: "worker-1", startedAt: hoursAgo(8), durationMs: 12_440, retries: 0 },
  { id: "job_008", orgId: ORG, type: "extract", status: "failed", documentId: "dc_003", documentName: "receipt_taxi_0921.jpg", worker: "worker-2", startedAt: hoursAgo(8), durationMs: 940, retries: 2 },
  { id: "job_009", orgId: ORG, type: "extract", status: "retrying", documentId: "dc_003", documentName: "receipt_taxi_0921.jpg", worker: "worker-5", startedAt: minsAgo(4), durationMs: 0, retries: 1 },
  { id: "job_010", orgId: ORG, type: "parse", status: "running", documentId: "dc_014", documentName: "scan_signed_quote_brightpath.png", worker: "worker-4", startedAt: minsAgo(2), durationMs: 0, retries: 0 },
  { id: "job_011", orgId: ORG, type: "ocr", status: "running", documentId: "dc_005", documentName: "w9_form_jane.pdf", worker: "worker-2", startedAt: minsAgo(3), durationMs: 0, retries: 0 },
  { id: "job_012", orgId: ORG, type: "parse", status: "queued", documentId: "dc_009", documentName: "nda_meridian.pdf", worker: "—", startedAt: minsAgo(1), durationMs: 0, retries: 0 },
  { id: "job_013", orgId: ORG, type: "extract", status: "queued", documentId: "dc_004", documentName: "passport_ghazaryan.pdf", worker: "—", startedAt: minsAgo(1), durationMs: 0, retries: 0 },
  { id: "job_014", orgId: ORG, type: "classify", status: "queued", documentId: "dc_013", documentName: "leads_export_q3.csv", worker: "—", startedAt: minsAgo(1), durationMs: 0, retries: 0 },
  { id: "job_015", orgId: ORG, type: "export", status: "success", documentId: "dc_007", documentName: "quote_signed_brightpath.pdf", worker: "worker-1", startedAt: daysAgo(6), durationMs: 2240, retries: 0 },
  { id: "job_016", orgId: ORG, type: "export", status: "success", documentId: "dc_012", documentName: "msa_master_v4.pdf", worker: "worker-3", startedAt: daysAgo(12), durationMs: 3120, retries: 0 },
  { id: "job_017", orgId: ORG, type: "export", status: "failed", documentId: "dc_008", documentName: "purchase_order_helix.xlsx", worker: "worker-4", startedAt: daysAgo(9), durationMs: 980, retries: 3 },
  { id: "job_018", orgId: ORG, type: "ocr", status: "running", documentId: "dc_006", documentName: "bank_statement_aug.pdf", worker: "worker-1", startedAt: minsAgo(5), durationMs: 0, retries: 0 },
  { id: "job_019", orgId: ORG, type: "parse", status: "running", documentId: "dc_010", documentName: "employment_contract_2026.docx", worker: "worker-2", startedAt: minsAgo(6), durationMs: 0, retries: 0 },
  { id: "job_020", orgId: ORG, type: "extract", status: "running", documentId: "dc_011", documentName: "utility_bill_sept.pdf", worker: "worker-4", startedAt: minsAgo(7), durationMs: 0, retries: 0 },
  { id: "job_021", orgId: ORG, type: "validate", status: "running", documentId: "dc_002", documentName: "contract_vortex_v3.docx", worker: "worker-6", startedAt: minsAgo(8), durationMs: 0, retries: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const docflowExports: DocExport[] = [
  { id: "ex_001", orgId: ORG, target: "QuickBooks Online", format: "erp_quickbooks", records: 124, status: "success", createdAt: daysAgo(2), createdByName: "Aram Hayrapetyan" },
  { id: "ex_002", orgId: ORG, target: "Data lake (S3)", format: "json", records: 318, status: "success", createdAt: daysAgo(5), createdByName: "Lilit Avetisyan" },
  { id: "ex_003", orgId: ORG, target: "Finance — CSV bundle", format: "csv", records: 42, status: "success", createdAt: daysAgo(8), createdByName: "Anna Petrosyan" },
  { id: "ex_004", orgId: ORG, target: "SAP S/4HANA", format: "erp_sap", records: 88, status: "failed", createdAt: daysAgo(10), createdByName: "Aram Hayrapetyan" },
  { id: "ex_005", orgId: ORG, target: "Microsoft Dynamics", format: "erp_dynamics", records: 0, status: "running", createdAt: minsAgo(15), createdByName: "Aram Hayrapetyan" },
  { id: "ex_006", orgId: ORG, target: "Data lake (S3)", format: "json", records: 0, status: "queued", createdAt: minsAgo(2), createdByName: "Lilit Avetisyan" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Settings — AI providers, OCR packs, MIME limits, storage
// ─────────────────────────────────────────────────────────────────────────────

export const docflowAiProviders: DocAiProvider[] = [
  {
    id: "ap_ollama",
    name: "Ollama Cloud",
    endpoint: "https://ollama-cloud.haydev.os/v1",
    model: "llama3.2-vision:11b",
    apiKeyMasked: "oc_••••••••••••2f4a",
    enabled: true,
  },
  {
    id: "ap_openai",
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyMasked: "sk_••••••••••••91c0",
    enabled: false,
  },
];

export const docflowOcrLangPacks: DocOcrLangPack[] = [
  { code: "hy", name: "Armenian (Հայերեն)", enabled: true },
  { code: "ru", name: "Russian (Русский)", enabled: true },
  { code: "en", name: "English", enabled: true },
];

export const docflowMimeLimits: DocMimeLimit[] = [
  { mime: "application/pdf", type: "pdf", maxSizeMb: 25, enabled: true },
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", type: "docx", maxSizeMb: 25, enabled: true },
  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", type: "xlsx", maxSizeMb: 25, enabled: true },
  { mime: "text/csv", type: "csv", maxSizeMb: 10, enabled: true },
  { mime: "text/plain", type: "txt", maxSizeMb: 5, enabled: true },
  { mime: "image/png", type: "png", maxSizeMb: 15, enabled: true },
  { mime: "image/jpeg", type: "jpg", maxSizeMb: 15, enabled: true },
];

export const docflowStorageConfig: DocStorageConfig = {
  bucket: "haydev-docflow",
  region: "eu-central-1",
  endpoint: "s3.eu-central-1.amazonaws.com",
  encryption: "SSE-KMS",
};

// ─────────────────────────────────────────────────────────────────────────────
// Analytics — derived series
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcessedPoint {
  date: string;
  count: number;
  invoice: number;
  contract: number;
  receipt: number;
  id: number;
  form: number;
  other: number;
}

export const docflowProcessedOverTime: ProcessedPoint[] = (() => {
  const days = 14;
  const out: ProcessedPoint[] = [];
  const seed = [4, 7, 5, 9, 6, 8, 11, 7, 10, 12, 8, 13, 9, 14];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const total = seed[days - 1 - i] ?? 6;
    const invoice = Math.round(total * 0.34);
    const contract = Math.round(total * 0.22);
    const receipt = Math.round(total * 0.20);
    const id = Math.round(total * 0.08);
    const form = Math.round(total * 0.10);
    out.push({
      date: d.toISOString().slice(0, 10),
      count: total,
      invoice,
      contract,
      receipt,
      id,
      form,
      other: Math.max(0, total - invoice - contract - receipt - id - form),
    });
  }
  return out;
})();

export const docflowByType: { type: DocType; label: string; count: number; confidence: number }[] = [
  { type: "pdf", label: "PDF", count: 218, confidence: 0.93 },
  { type: "docx", label: "DOCX", count: 84, confidence: 0.91 },
  { type: "jpg", label: "JPG", count: 61, confidence: 0.82 },
  { type: "png", label: "PNG", count: 47, confidence: 0.79 },
  { type: "xlsx", label: "XLSX", count: 39, confidence: 0.88 },
  { type: "csv", label: "CSV", count: 22, confidence: 0.95 },
  { type: "txt", label: "TXT", count: 14, confidence: 0.97 },
];

export const docflowConfidenceDist: { bucket: string; count: number; tone: "rose" | "amber" | "lime" }[] = [
  { bucket: "< 0.70", count: 18, tone: "rose" },
  { bucket: "0.70 – 0.89", count: 64, tone: "amber" },
  { bucket: "0.90 – 1.00", count: 403, tone: "lime" },
];

export const docflowReviewThroughput: { date: string; reviewed: number }[] = (() => {
  const days = 14;
  const out: { date: string; reviewed: number }[] = [];
  const seed = [9, 12, 7, 14, 10, 16, 13, 11, 18, 15, 12, 19, 14, 22];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    out.push({ date: d.toISOString().slice(0, 10), reviewed: seed[days - 1 - i] ?? 10 });
  }
  return out;
})();

export const docflowKpis = {
  total: 485,
  avgTimeSec: 8.4,
  errorRatePct: 2.3,
  reviewedToday: 22,
  pendingReview: 11,
  avgConfidence: 0.91,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline simulation helpers
// ─────────────────────────────────────────────────────────────────────────────

export const PIPELINE_STAGES: DocPipelineStage[] = [
  "ingest",
  "parse",
  "ocr",
  "classify",
  "extract",
  "validate",
  "review",
  "export",
];

export const STAGE_PROGRESS: Record<DocPipelineStage, number> = {
  ingest: 6,
  parse: 22,
  ocr: 38,
  classify: 52,
  extract: 68,
  validate: 78,
  review: 90,
  export: 100,
};

/** Map a pipeline stage to its terminal DocStatus. */
export function stageToStatus(stage: DocPipelineStage): DocumentStatus {
  switch (stage) {
    case "ingest":
    case "parse":
    case "ocr":
      return "processing";
    case "classify":
      return "classified";
    case "extract":
      return "extracted";
    case "validate":
      return "extracted";
    case "review":
      return "reviewed";
    case "export":
      return "approved";
  }
}

/** Pick a representative classification + fields for a freshly-classified doc. */
export function classifySample(filename: string): {
  classification: DocumentClass;
  confidence: number;
  ocrLang: OcrLang | null;
} {
  const lower = filename.toLowerCase();
  if (lower.includes("invoice") || lower.includes("bill")) {
    return { classification: "invoice", confidence: 0.96, ocrLang: null };
  }
  if (lower.includes("contract") || lower.includes("nda") || lower.includes("msa") || lower.includes("agreement")) {
    return { classification: "contract", confidence: 0.94, ocrLang: null };
  }
  if (lower.includes("receipt") || lower.includes("taxi")) {
    return { classification: "receipt", confidence: 0.83, ocrLang: "ru" };
  }
  if (lower.includes("passport") || lower.includes("id") || lower.includes("license")) {
    return { classification: "id", confidence: 0.91, ocrLang: "hy" };
  }
  if (lower.includes("statement") || lower.includes("po_") || lower.includes("purchase")) {
    return { classification: "form", confidence: 0.87, ocrLang: null };
  }
  return { classification: "other", confidence: 0.76, ocrLang: null };
}

/** Build a fresh set of fields once the document reaches the extract stage. */
export function buildSampleFields(
  classification: DocumentClass,
  filename: string,
): DocFieldEx[] {
  const mk = (
    key: string,
    value: string,
    confidence: number,
    page: number,
    excerpt: string,
    offsets: [number, number],
  ): DocFieldEx => ({
    key,
    value,
    confidence,
    reviewed: false,
    validation: confidence >= 0.9 ? "valid" : confidence >= 0.7 ? "warning" : "invalid",
    provenance: { page, excerpt, offsets },
  });

  switch (classification) {
    case "invoice":
      return [
        mk("vendor", "ACME Supplies", 0.96, 1, "From: ACME Supplies LLC", [6, 24]),
        mk("invoice_number", "INV-" + Math.floor(2000 + Math.random() * 999), 0.94, 1, "Invoice #: INV-XXXX", [12, 20]),
        mk("total", "$" + Math.floor(1000 + Math.random() * 90000).toLocaleString() + ".00", 0.91, 1, "TOTAL DUE: $XX,XXX.00", [12, 23]),
        mk("due_date", "2026-10-30", 0.88, 1, "Due: 2026-10-30", [5, 15]),
      ];
    case "contract":
      return [
        mk("counterparty", "Vortex Labs LLC", 0.93, 1, "Vortex Labs LLC (\"Contractor\")", [0, 16]),
        mk("effective_date", "2026-09-01", 0.9, 1, "as of 2026-09-01", [6, 16]),
        mk("term_months", "24", 0.84, 1, "twenty-four (24) months", [16, 18]),
      ];
    case "receipt":
      return [
        mk("merchant", "Yandex Taxi", 0.82, 1, "Yandex Taxi — Trip Receipt", [0, 11]),
        mk("amount", Math.floor(500 + Math.random() * 4000) + " RUB", 0.76, 1, "Total: X RUB", [7, 16]),
        mk("date", "2026-09-21", 0.85, 1, "Date: 2026-09-21 19:42", [6, 16]),
      ];
    case "id":
      return [
        mk("type", "Passport (AM)", 0.9, 1, "REPUBLIC OF ARMENIA — PASSPORT", [0, 30]),
        mk("document_number", "AM " + Math.floor(1000 + Math.random() * 9000) + " " + Math.floor(1000 + Math.random() * 9000), 0.85, 1, "Passport No. AM X XXXX XXXX", [13, 28]),
      ];
    case "form":
      return [
        mk("account_holder", "HayDev HQ LLC", 0.91, 1, "Account holder: HayDev HQ LLC", [17, 30]),
        mk("period", "2026-08-01 → 2026-08-31", 0.88, 1, "Period: 2026-08-01 to 2026-08-31", [8, 32]),
        mk("closing_balance", "$" + Math.floor(100000 + Math.random() * 900000).toLocaleString() + ".00", 0.82, 1, "Closing balance: $XXX,XXX.00", [17, 30]),
      ];
    default:
      return [
        mk("title", filename.replace(/\.[^.]+$/, ""), 0.78, 1, "Document title", [0, 20]),
        mk("row_count", String(Math.floor(20 + Math.random() * 200)), 0.9, 1, "rows=N", [5, 7]),
      ];
  }
}

/** Build a brand new DocRecord for a freshly uploaded file. */
export function buildNewDocument(opts: {
  filename: string;
  mime: string;
  size: number;
  uploadedById: string;
  uploadedByName: string;
  batchId: string | null;
}): DocRecord {
  const type = typeFromMime(opts.mime);
  const ocrLang: OcrLang | null = type === "png" || type === "jpg" ? "en" : null;
  return {
    id: "dc_" + Math.random().toString(36).slice(2, 8),
    orgId: ORG,
    filename: opts.filename,
    mime: opts.mime,
    type,
    size: opts.size,
    status: "pending",
    stage: "ingest",
    progressPct: STAGE_PROGRESS.ingest,
    uploadedById: opts.uploadedById,
    uploadedByName: opts.uploadedByName,
    batchId: opts.batchId,
    classification: null,
    confidence: null,
    ocrLang,
    pages: type === "pdf" || type === "docx" ? Math.floor(1 + Math.random() * 8) : 1,
    version: 1,
    versions: [
      { version: 1, editedAt: new Date().toISOString(), editedBy: opts.uploadedByName, note: "Uploaded" },
    ],
    fields: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Sample files for the upload dialog quick-pick. */
export const SAMPLE_FILES: { filename: string; mime: string; size: number }[] = [
  { filename: "invoice_acme_9923.pdf", mime: "application/pdf", size: 248_320 },
  { filename: "nda_helios_v2.pdf", mime: "application/pdf", size: 142_000 },
  { filename: "receipt_cafe_0922.jpg", mime: "image/jpeg", size: 92_410 },
  { filename: "passport_am_8821.pdf", mime: "application/pdf", size: 412_980 },
  { filename: "statement_oct.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 96_120 },
  { filename: "leads_export.csv", mime: "text/csv", size: 18_440 },
  { filename: "draft_notes.txt", mime: "text/plain", size: 4_280 },
  { filename: "scanned_doc.png", mime: "image/png", size: 1_804_880 },
];

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
];

export const MAX_FILE_SIZE_MB = 25;
