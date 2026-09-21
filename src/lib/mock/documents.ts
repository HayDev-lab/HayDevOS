import type { MockDocument } from "./types";

const ORG = "org_haydev";
const UPLOADER = "usr_owner";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();

export const mockDocuments: MockDocument[] = [
  {
    id: "dc_001", orgId: ORG, filename: "invoice_ACME_2841.pdf", mime: "application/pdf",
    size: 248_320, status: "approved", uploadedById: UPLOADER, batchId: "bt_001",
    classification: "invoice",
    fields: [
      { key: "vendor", value: "ACME Supplies", confidence: 0.98, reviewed: true },
      { key: "invoice_number", value: "INV-2841", confidence: 0.99, reviewed: true },
      { key: "total", value: "$12,480.00", confidence: 0.97, reviewed: true },
      { key: "due_date", value: "2026-10-15", confidence: 0.94, reviewed: true },
    ],
    createdAt: daysAgo(2),
  },
  {
    id: "dc_002", orgId: ORG, filename: "contract_vortex_v3.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 542_210, status: "reviewed", uploadedById: "usr_rep1", batchId: "bt_002",
    classification: "contract",
    fields: [
      { key: "counterparty", value: "Vortex Labs LLC", confidence: 0.96, reviewed: true },
      { key: "effective_date", value: "2026-09-01", confidence: 0.92, reviewed: true },
      { key: "term_months", value: "24", confidence: 0.88, reviewed: true },
      { key: "auto_renewal", value: "true", confidence: 0.71, reviewed: false },
    ],
    createdAt: daysAgo(4),
  },
  {
    id: "dc_003", orgId: ORG, filename: "receipt_taxi_0921.jpg", mime: "image/jpeg",
    size: 88_410, status: "extracted", uploadedById: "usr_rep2", batchId: "bt_003",
    classification: "receipt",
    fields: [
      { key: "merchant", value: "Yandex Taxi", confidence: 0.84, reviewed: false },
      { key: "amount", value: "1,480 RUB", confidence: 0.79, reviewed: false },
      { key: "date", value: "2026-09-20", confidence: 0.81, reviewed: false },
    ],
    createdAt: hoursAgo(8),
  },
  {
    id: "dc_004", orgId: ORG, filename: "passport_ghazaryan.pdf", mime: "application/pdf",
    size: 412_980, status: "classified", uploadedById: UPLOADER, batchId: null,
    classification: "id",
    fields: [
      { key: "type", value: "Passport (AM)", confidence: 0.91, reviewed: false },
    ],
    createdAt: hoursAgo(3),
  },
  {
    id: "dc_005", orgId: ORG, filename: "w9_form_jane.pdf", mime: "application/pdf",
    size: 156_770, status: "processing", uploadedById: "usr_rep1", batchId: "bt_004",
    classification: null,
    fields: [],
    createdAt: hoursAgo(1),
  },
  {
    id: "dc_006", orgId: ORG, filename: "bank_statement_aug.pdf", mime: "application/pdf",
    size: 1_842_330, status: "extracted", uploadedById: UPLOADER, batchId: "bt_005",
    classification: "form",
    fields: [
      { key: "account_holder", value: "HayDev HQ LLC", confidence: 0.93, reviewed: false },
      { key: "period", value: "2026-08-01 → 2026-08-31", confidence: 0.9, reviewed: false },
      { key: "closing_balance", value: "$842,910.55", confidence: 0.86, reviewed: false },
    ],
    createdAt: daysAgo(1),
  },
  {
    id: "dc_007", orgId: ORG, filename: "quote_signed_brightpath.pdf", mime: "application/pdf",
    size: 312_400, status: "approved", uploadedById: "usr_rep1", batchId: null,
    classification: "contract",
    fields: [
      { key: "signer", value: "Lilit Avetisyan", confidence: 0.97, reviewed: true },
      { key: "signed_at", value: "2026-09-15T14:22:00Z", confidence: 0.95, reviewed: true },
    ],
    createdAt: daysAgo(7),
  },
  {
    id: "dc_008", orgId: ORG, filename: "purchase_order_helix.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 96_120, status: "rejected", uploadedById: "usr_rep2", batchId: null,
    classification: "form",
    fields: [
      { key: "po_number", value: "PO-9921", confidence: 0.9, reviewed: true },
      { key: "reject_reason", value: "Duplicate of PO-9918", confidence: 1, reviewed: true },
    ],
    createdAt: daysAgo(10),
  },
  {
    id: "dc_009", orgId: ORG, filename: "nda_meridian.pdf", mime: "application/pdf",
    size: 198_000, status: "pending", uploadedById: UPLOADER, batchId: "bt_006",
    classification: null,
    fields: [],
    createdAt: hoursAgo(0.2),
  },
  {
    id: "dc_010", orgId: ORG, filename: "employment_contract_2026.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 421_880, status: "classified", uploadedById: UPLOADER, batchId: null,
    classification: "contract",
    fields: [
      { key: "employee", value: "Anna Petrosyan", confidence: 0.94, reviewed: false },
      { key: "start_date", value: "2026-10-01", confidence: 0.89, reviewed: false },
    ],
    createdAt: daysAgo(3),
  },
  {
    id: "dc_011", orgId: ORG, filename: "utility_bill_sept.pdf", mime: "application/pdf",
    size: 142_330, status: "extracted", uploadedById: "usr_rep2", batchId: "bt_007",
    classification: "receipt",
    fields: [
      { key: "provider", value: "Electric Networks of Armenia", confidence: 0.87, reviewed: false },
      { key: "amount", value: "84,200 AMD", confidence: 0.83, reviewed: false },
    ],
    createdAt: hoursAgo(12),
  },
  {
    id: "dc_012", orgId: ORG, filename: "msa_master_v4.pdf", mime: "application/pdf",
    size: 921_440, status: "approved", uploadedById: UPLOADER, batchId: null,
    classification: "contract",
    fields: [
      { key: "title", value: "Master Services Agreement", confidence: 0.99, reviewed: true },
      { key: "version", value: "4.0", confidence: 0.98, reviewed: true },
    ],
    createdAt: daysAgo(15),
  },
];
