/**
 * QuoteFlow data layer — re-exports the foundation mock data and adds
 * QuoteFlow-specific datasets: price books, pricing rules, templates,
 * approvals, generated documents, share links, audit/activity, requests.
 *
 * All records carry orgId "org_haydev" to stay consistent with Task 1's mocks.
 */

export {
  mockQuotes,
  mockProducts,
  mockLeads,
  mockCustomers,
  type MockQuote,
  type MockQuoteItem,
  type MockProduct,
  type MockLead,
  type MockCustomer,
  type QuoteStatus,
} from "@/lib/mock";

export type {
  DiscountType,
  PricingRule,
  PricingRuleType,
  PricingTier,
  RecurringPeriod,
  LineItemInput,
  LineResult,
  PriceCalculation,
  QuoteDiscount,
} from "./pricing";

export {
  calculateLineItem,
  calculateQuote,
  applyRule,
  round2,
  summarizeCalculation,
} from "./pricing";

import { mockQuotes, mockProducts, mockLeads, mockCustomers } from "@/lib/mock";
import type { MockQuote, MockLead, MockCustomer, MockProduct } from "@/lib/mock";
import type { PricingRule } from "./pricing";

// ─────────────────────────────────────────────────────────────────────────────
// Pricing rules (5 sample rules covering all rule types)
// ─────────────────────────────────────────────────────────────────────────────

export const mockPricingRules: PricingRule[] = [
  {
    id: "rule_tier_volume",
    name: "Volume — Enterprise seats",
    type: "tiered",
    active: true,
    appliesToSku: "HAY-ENT-AN",
    tiers: [
      { qty: 1, unitPrice: 3000 },
      { qty: 25, unitPrice: 2900 },
      { qty: 50, unitPrice: 2800 },
      { qty: 100, unitPrice: 2700 },
      { qty: 200, unitPrice: 2600 },
    ],
  },
  {
    id: "rule_min_floor",
    name: "Floor — Implementation",
    type: "minimum",
    active: true,
    appliesToSku: "SVC-IMPL",
    minPrice: 12000,
  },
  {
    id: "rule_setup_onboarding",
    name: "Setup fee — Custom integration",
    type: "setup",
    active: true,
    appliesToSku: "INT-CUSTOM",
    setupFee: 4000,
  },
  {
    id: "rule_recurring_addon",
    name: "Monthly — DocSmart add-on",
    type: "recurring",
    active: true,
    appliesToSku: "ADD-DOCSMART",
    recurringPeriod: "monthly",
  },
  {
    id: "rule_markup_custom",
    name: "Markup 12% — Custom integration",
    type: "markup",
    active: true,
    appliesToSku: "INT-CUSTOM",
    markupPct: 12,
  },
];

export const mockRulesById: Record<string, PricingRule> = Object.fromEntries(
  mockPricingRules.map((r) => [r.id, r]),
);

// ─────────────────────────────────────────────────────────────────────────────
// Price books (3 books: Base, EMEA, APAC)
// ─────────────────────────────────────────────────────────────────────────────

export interface PriceBookRate {
  productId: string;
  sku: string;
  productName: string;
  basePrice: number;
  bookPrice: number;
}

export interface PriceBook {
  id: string;
  orgId: string;
  name: string;
  region: string;
  currency: string;
  active: boolean;
  isBase: boolean;
  rates: PriceBookRate[];
}

function buildPriceBook(
  id: string,
  name: string,
  region: string,
  currency: string,
  active: boolean,
  isBase: boolean,
  multiplier: number,
): PriceBook {
  const rates: PriceBookRate[] = mockProducts.map((p: MockProduct) => ({
    productId: p.id,
    sku: p.sku,
    productName: p.name,
    basePrice: p.price,
    bookPrice: Math.round(p.price * multiplier),
  }));
  return { id, orgId: "org_haydev", name, region, currency, active, isBase, rates };
}

export const mockPriceBooks: PriceBook[] = [
  buildPriceBook("pb_base", "Base list", "Global", "USD", true, true, 1),
  buildPriceBook("pb_emea", "EMEA — EUR", "Europe", "EUR", true, false, 0.92),
  buildPriceBook("pb_apac", "APAC — USD", "Asia-Pacific", "USD", true, false, 0.85),
];

// ─────────────────────────────────────────────────────────────────────────────
// Document templates (4 templates — HY, RU, EN + a starter one)
// ─────────────────────────────────────────────────────────────────────────────

export interface QuoteTemplate {
  id: string;
  orgId: string;
  name: string;
  language: "hy" | "ru" | "en";
  isDefault: boolean;
  sections: string[];
  /** A short markdown-ish preview body. */
  preview: string;
  updatedAt: string;
}

const tplNow = Date.now();
const tplAgo = (d: number) => new Date(tplNow - d * 86400000).toISOString();

export const mockTemplates: QuoteTemplate[] = [
  {
    id: "tpl_en_standard",
    orgId: "org_haydev",
    name: "Standard — English",
    language: "en",
    isDefault: true,
    sections: ["header", "parties", "line_items", "totals", "terms", "signature"],
    preview:
      "# Quote {number}\n\nFrom: HayDev HQ  ·  To: {customer}\nIssued: {issued}  ·  Valid until: {valid}\n\n## Items\n| Product | Qty | Unit | Total |\n|---|---|---|---|\n| {items} |\n\n## Totals\nSubtotal: {subtotal}\nDiscount: {discount}\nTax: {tax}\n**Total: {total}**\n\n## Terms\n{notes}",
    updatedAt: tplAgo(7),
  },
  {
    id: "tpl_hy_standard",
    orgId: "org_haydev",
    name: "Ստանդարտ — Հայերեն",
    language: "hy",
    isDefault: false,
    sections: ["header", "parties", "line_items", "totals", "terms", "signature"],
    preview:
      "# Առաջարկ {number}\n\nՈւմից՝ HayDev HQ · Ում՝ {customer}\nԿազմված է՝ {issued} · Ուժային մինչ՝ {valid}\n\n## Տարրեր\n{items}\n\n## Գումարներ\nՄիջանկյալ՝ {subtotal}\nԶեղչ՝ {discount}\nՀարկ՝ {tax}\n**Ընդհանուր՝ {total}**",
    updatedAt: tplAgo(5),
  },
  {
    id: "tpl_ru_standard",
    orgId: "org_haydev",
    name: "Стандарт — Русский",
    language: "ru",
    isDefault: false,
    sections: ["header", "parties", "line_items", "totals", "terms", "signature"],
    preview:
      "# КП {number}\n\nОт: HayDev HQ · Кому: {customer}\nСоздано: {issued} · Действует до: {valid}\n\n## Позиции\n{items}\n\n## Итоги\nПодытог: {subtotal}\nСкидка: {discount}\nНалог: {tax}\n**Итого: {total}**",
    updatedAt: tplAgo(3),
  },
  {
    id: "tpl_en_lite",
    orgId: "org_haydev",
    name: "Lite — English (one-pager)",
    language: "en",
    isDefault: false,
    sections: ["header", "line_items", "totals"],
    preview:
      "# {number} — {customer}\n{items}\n\n**Total: {total}** — valid until {valid}",
    updatedAt: tplAgo(1),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Approvals (queue + history)
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequest {
  id: string;
  orgId: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  requestedAt: string;
  decidedAt: string | null;
  discountPct: number;
  marginPct: number;
  totalValue: number;
  currency: string;
  threshold: string;
  approverId: string;
  approverName: string;
  status: ApprovalStatus;
  reason: string | null;
}

const appNow = Date.now();
const appAgo = (d: number) => new Date(appNow - d * 86400000).toISOString();
const appHoursAgo = (h: number) => new Date(appNow - h * 3600000).toISOString();

export const mockApprovals: ApprovalRequest[] = [
  {
    id: "ap_001",
    orgId: "org_haydev",
    quoteId: "qt_003",
    quoteNumber: "Q-2026-0144",
    customerName: "BrightPath",
    requestedAt: appHoursAgo(4),
    decidedAt: null,
    discountPct: 0,
    marginPct: 72,
    totalValue: 316240,
    currency: "USD",
    threshold: "value > $250k",
    approverId: "usr_owner",
    approverName: "Aram Hayrapetyan",
    status: "pending",
    reason: null,
  },
  {
    id: "ap_002",
    orgId: "org_haydev",
    quoteId: "qt_002",
    quoteNumber: "Q-2026-0143",
    customerName: "Markos Group",
    requestedAt: appAgo(9),
    decidedAt: appAgo(8),
    discountPct: 9.8,
    marginPct: 61,
    totalValue: 132000,
    currency: "USD",
    threshold: "discount > 5%",
    approverId: "usr_owner",
    approverName: "Aram Hayrapetyan",
    status: "approved",
    reason: "Approved — strategic account.",
  },
  {
    id: "ap_003",
    orgId: "org_haydev",
    quoteId: "qt_004",
    quoteNumber: "Q-2026-0145",
    customerName: "Quant Edge",
    requestedAt: appAgo(7),
    decidedAt: appAgo(6),
    discountPct: 7.6,
    marginPct: 58,
    totalValue: 219660,
    currency: "EUR",
    threshold: "discount > 5%",
    approverId: "usr_owner",
    approverName: "Aram Hayrapetyan",
    status: "approved",
    reason: "Approved — competitive EMEA deal.",
  },
  {
    id: "ap_004",
    orgId: "org_haydev",
    quoteId: "qt_007",
    quoteNumber: "Q-2026-0148",
    customerName: "Stellar Works",
    requestedAt: appAgo(20),
    decidedAt: appAgo(19),
    discountPct: 0,
    marginPct: 41,
    totalValue: 49980,
    currency: "USD",
    threshold: "margin < 45%",
    approverId: "usr_owner",
    approverName: "Aram Hayrapetyan",
    status: "rejected",
    reason: "Rejected — margin below floor.",
  },
  {
    id: "ap_005",
    orgId: "org_haydev",
    quoteId: "qt_006",
    quoteNumber: "Q-2026-0147",
    customerName: "Helix Corp",
    requestedAt: appAgo(28),
    decidedAt: appAgo(27),
    discountPct: 7.3,
    marginPct: 64,
    totalValue: 448400,
    currency: "USD",
    threshold: "value > $250k",
    approverId: "usr_owner",
    approverName: "Aram Hayrapetyan",
    status: "approved",
    reason: "Approved — expansion deal.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Generated documents (PDF / DOCX exports) — keyed by quote id
// ─────────────────────────────────────────────────────────────────────────────

export type GeneratedDocumentKind = "pdf" | "docx";

export interface GeneratedDocument {
  id: string;
  orgId: string;
  quoteId: string;
  kind: GeneratedDocumentKind;
  templateId: string;
  templateName: string;
  language: "hy" | "ru" | "en";
  sizeKb: number;
  generatedAt: string;
  generatedBy: string;
}

const docNow = Date.now();
const docAgo = (d: number) => new Date(docNow - d * 86400000).toISOString();

export const mockGeneratedDocuments: GeneratedDocument[] = [
  { id: "gd_001", orgId: "org_haydev", quoteId: "qt_001", kind: "pdf", templateId: "tpl_en_standard", templateName: "Standard — English", language: "en", sizeKb: 184, generatedAt: docAgo(5), generatedBy: "usr_rep1" },
  { id: "gd_002", orgId: "org_haydev", quoteId: "qt_001", kind: "docx", templateId: "tpl_en_standard", templateName: "Standard — English", language: "en", sizeKb: 92, generatedAt: docAgo(5), generatedBy: "usr_rep1" },
  { id: "gd_003", orgId: "org_haydev", quoteId: "qt_002", kind: "pdf", templateId: "tpl_en_standard", templateName: "Standard — English", language: "en", sizeKb: 210, generatedAt: docAgo(9), generatedBy: "usr_rep2" },
  { id: "gd_004", orgId: "org_haydev", quoteId: "qt_002", kind: "pdf", templateId: "tpl_en_standard", templateName: "Standard — English", language: "en", sizeKb: 218, generatedAt: docAgo(4), generatedBy: "usr_rep2" },
  { id: "gd_005", orgId: "org_haydev", quoteId: "qt_004", kind: "pdf", templateId: "tpl_en_standard", templateName: "Standard — English", language: "en", sizeKb: 198, generatedAt: docAgo(7), generatedBy: "usr_owner" },
  { id: "gd_006", orgId: "org_haydev", quoteId: "qt_006", kind: "pdf", templateId: "tpl_en_standard", templateName: "Standard — English", language: "en", sizeKb: 256, generatedAt: docAgo(28), generatedBy: "usr_owner" },
  { id: "gd_007", orgId: "org_haydev", quoteId: "qt_008", kind: "pdf", templateId: "tpl_en_standard", templateName: "Standard — English", language: "en", sizeKb: 232, generatedAt: docAgo(40), generatedBy: "usr_owner" },
  { id: "gd_008", orgId: "org_haydev", quoteId: "qt_008", kind: "docx", templateId: "tpl_en_standard", templateName: "Standard — English", language: "en", sizeKb: 118, generatedAt: docAgo(40), generatedBy: "usr_owner" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Client share links
// ─────────────────────────────────────────────────────────────────────────────

export interface ClientShareLink {
  id: string;
  orgId: string;
  quoteId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
}

const shareNow = Date.now();
const shareAgo = (d: number) => new Date(shareNow - d * 86400000).toISOString();
const shareAhead = (d: number) => new Date(shareNow + d * 86400000).toISOString();
const shareHoursAgo = (h: number) => new Date(shareNow - h * 3600000).toISOString();

export const mockShareLinks: ClientShareLink[] = [
  { id: "sl_001", orgId: "org_haydev", quoteId: "qt_001", token: "qt_001_a8f3kd9s", createdAt: shareAgo(5), expiresAt: shareAhead(16), revokedAt: null, viewCount: 4, lastViewedAt: shareHoursAgo(20) },
  { id: "sl_002", orgId: "org_haydev", quoteId: "qt_002", token: "qt_002_b2c1lk7x", createdAt: shareAgo(9), expiresAt: shareAhead(-2), revokedAt: null, viewCount: 7, lastViewedAt: shareAgo(2) },
  { id: "sl_003", orgId: "org_haydev", quoteId: "qt_004", token: "qt_004_c0d2mf3z", createdAt: shareAgo(7), expiresAt: shareAhead(7), revokedAt: null, viewCount: 2, lastViewedAt: shareHoursAgo(48) },
  { id: "sl_004", orgId: "org_haydev", quoteId: "qt_005", token: "qt_005_d1e3np8q", createdAt: shareAgo(35), expiresAt: shareAgo(3), revokedAt: shareAgo(2), viewCount: 1, lastViewedAt: shareAgo(4) },
  { id: "sl_005", orgId: "org_haydev", quoteId: "qt_006", token: "qt_006_e9f2qr4t", createdAt: shareAgo(28), expiresAt: shareAhead(0), revokedAt: null, viewCount: 11, lastViewedAt: shareHoursAgo(2) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Quote activity / audit timeline
// ─────────────────────────────────────────────────────────────────────────────

export type QuoteActivityType =
  | "created"
  | "updated"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "revised"
  | "approval_requested"
  | "approval_decided"
  | "document_generated"
  | "share_created"
  | "share_revoked"
  | "expired";

export interface QuoteActivity {
  id: string;
  orgId: string;
  quoteId: string;
  type: QuoteActivityType;
  actorId: string;
  actorName: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const actNow = Date.now();
const actAgo = (d: number) => new Date(actNow - d * 86400000).toISOString();
const actHoursAgo = (h: number) => new Date(actNow - h * 3600000).toISOString();

export const mockQuoteActivity: QuoteActivity[] = [
  { id: "qa_001", orgId: "org_haydev", quoteId: "qt_001", type: "created", actorId: "usr_rep1", actorName: "Lilit Sargsyan", message: "Quote created", createdAt: actAgo(5) },
  { id: "qa_002", orgId: "org_haydev", quoteId: "qt_001", type: "document_generated", actorId: "usr_rep1", actorName: "Lilit Sargsyan", message: "PDF generated (Standard — English)", createdAt: actAgo(5), metadata: { kind: "pdf", templateId: "tpl_en_standard" } },
  { id: "qa_003", orgId: "org_haydev", quoteId: "qt_001", type: "share_created", actorId: "usr_rep1", actorName: "Lilit Sargsyan", message: "Client share link created", createdAt: actAgo(5) },
  { id: "qa_004", orgId: "org_haydev", quoteId: "qt_001", type: "sent", actorId: "usr_rep1", actorName: "Lilit Sargsyan", message: "Quote sent to client", createdAt: actAgo(4) },
  { id: "qa_005", orgId: "org_haydev", quoteId: "qt_001", type: "viewed", actorId: "client", actorName: "Vortex Labs", message: "Client viewed the quote", createdAt: actHoursAgo(20) },

  { id: "qa_010", orgId: "org_haydev", quoteId: "qt_002", type: "created", actorId: "usr_rep2", actorName: "Tigran Gevorgyan", message: "Quote created (v1)", createdAt: actAgo(10) },
  { id: "qa_011", orgId: "org_haydev", quoteId: "qt_002", type: "approval_requested", actorId: "usr_rep2", actorName: "Tigran Gevorgyan", message: "Approval requested — discount 9.8% > 5% threshold", createdAt: actAgo(9) },
  { id: "qa_012", orgId: "org_haydev", quoteId: "qt_002", type: "approval_decided", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Approved — strategic account", createdAt: actAgo(8) },
  { id: "qa_013", orgId: "org_haydev", quoteId: "qt_002", type: "revised", actorId: "usr_rep2", actorName: "Tigran Gevorgyan", message: "Revised to v2 — added premium support line", createdAt: actAgo(8) },
  { id: "qa_014", orgId: "org_haydev", quoteId: "qt_002", type: "sent", actorId: "usr_rep2", actorName: "Tigran Gevorgyan", message: "Quote sent to client", createdAt: actAgo(7) },
  { id: "qa_015", orgId: "org_haydev", quoteId: "qt_002", type: "accepted", actorId: "client", actorName: "Markos Group", message: "Client accepted the quote", createdAt: actAgo(2) },

  { id: "qa_020", orgId: "org_haydev", quoteId: "qt_003", type: "created", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Quote created", createdAt: actAgo(2) },
  { id: "qa_021", orgId: "org_haydev", quoteId: "qt_003", type: "approval_requested", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Approval requested — value > $250k", createdAt: actHoursAgo(4) },

  { id: "qa_030", orgId: "org_haydev", quoteId: "qt_004", type: "created", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Quote created", createdAt: actAgo(7) },
  { id: "qa_031", orgId: "org_haydev", quoteId: "qt_004", type: "approval_requested", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Approval requested — discount 7.6% > 5%", createdAt: actAgo(7) },
  { id: "qa_032", orgId: "org_haydev", quoteId: "qt_004", type: "approval_decided", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Approved — competitive EMEA deal", createdAt: actAgo(6) },
  { id: "qa_033", orgId: "org_haydev", quoteId: "qt_004", type: "sent", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Quote sent to client", createdAt: actAgo(6) },

  { id: "qa_040", orgId: "org_haydev", quoteId: "qt_005", type: "created", actorId: "usr_rep1", actorName: "Lilit Sargsyan", message: "Quote created", createdAt: actAgo(35) },
  { id: "qa_041", orgId: "org_haydev", quoteId: "qt_005", type: "expired", actorId: "system", actorName: "System", message: "Quote expired (validUntil passed)", createdAt: actAgo(3) },

  { id: "qa_050", orgId: "org_haydev", quoteId: "qt_006", type: "created", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Quote created (v1)", createdAt: actAgo(28) },
  { id: "qa_051", orgId: "org_haydev", quoteId: "qt_006", type: "revised", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Revised to v2 — bundled DocSmart + Autopilot", createdAt: actAgo(20) },
  { id: "qa_052", orgId: "org_haydev", quoteId: "qt_006", type: "revised", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Revised to v3 — bumped seats 100 → 120", createdAt: actAgo(10) },
  { id: "qa_053", orgId: "org_haydev", quoteId: "qt_006", type: "accepted", actorId: "client", actorName: "Helix Corp", message: "Client accepted the quote", createdAt: actAgo(5) },

  { id: "qa_060", orgId: "org_haydev", quoteId: "qt_007", type: "created", actorId: "usr_rep1", actorName: "Lilit Sargsyan", message: "Quote created", createdAt: actAgo(20) },
  { id: "qa_061", orgId: "org_haydev", quoteId: "qt_007", type: "rejected", actorId: "client", actorName: "Stellar Works", message: "Client declined — chose competitor", createdAt: actAgo(2) },

  { id: "qa_070", orgId: "org_haydev", quoteId: "qt_008", type: "created", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Quote created (v1)", createdAt: actAgo(40) },
  { id: "qa_071", orgId: "org_haydev", quoteId: "qt_008", type: "revised", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Revised to v2 — added Audit module", createdAt: actAgo(35) },
  { id: "qa_072", orgId: "org_haydev", quoteId: "qt_008", type: "sent", actorId: "usr_owner", actorName: "Aram Hayrapetyan", message: "Quote sent to client", createdAt: actAgo(30) },
  { id: "qa_073", orgId: "org_haydev", quoteId: "qt_008", type: "accepted", actorId: "client", actorName: "DataVault", message: "Client accepted the quote", createdAt: actAgo(25) },
];

// ─────────────────────────────────────────────────────────────────────────────
// Inbound quote requests (from leads/customers)
// ─────────────────────────────────────────────────────────────────────────────

export type QuoteRequestStatus = "new" | "quoted" | "won" | "lost";

export interface QuoteRequest {
  id: string;
  orgId: string;
  requesterName: string;
  requesterEmail: string;
  company: string;
  description: string;
  budget: number;
  currency: string;
  leadId: string | null;
  customerId: string | null;
  status: QuoteRequestStatus;
  requestedAt: string;
  ownerName: string;
}

const reqNow = Date.now();
const reqAgo = (d: number) => new Date(reqNow - d * 86400000).toISOString();
const reqHoursAgo = (h: number) => new Date(reqNow - h * 3600000).toISOString();

export const mockQuoteRequests: QuoteRequest[] = [
  { id: "qr_001", orgId: "org_haydev", requesterName: "Narine Ghazaryan", requesterEmail: "n.gazaryan@vortex.am", company: "Vortex Labs", description: "Annual HayDevOS Growth for 24 seats + implementation package.", budget: 60000, currency: "USD", leadId: "ld_001", customerId: "cu_002", status: "quoted", requestedAt: reqAgo(6), ownerName: "Lilit Sargsyan" },
  { id: "qr_002", orgId: "org_haydev", requesterName: "Davit Markosyan", requesterEmail: "davit@markosgroup.ru", company: "Markos Group", description: "Scale plan for 40 seats, plus DocSmart add-on and premium support.", budget: 130000, currency: "USD", leadId: "ld_002", customerId: "cu_004", status: "won", requestedAt: reqAgo(10), ownerName: "Tigran Gevorgyan" },
  { id: "qr_003", orgId: "org_haydev", requesterName: "Lilit Avetisyan", requesterEmail: "lilit@brightpath.io", company: "BrightPath", description: "Enterprise plan, 80 seats + Autopilot credits. Multi-year interest.", budget: 320000, currency: "USD", leadId: "ld_003", customerId: "cu_005", status: "quoted", requestedAt: reqAgo(18), ownerName: "Aram Hayrapetyan" },
  { id: "qr_004", orgId: "org_haydev", requesterName: "Gevorg Minasyan", requesterEmail: "gevorg@novaforge.dev", company: "NovaForge", description: "Curious about Growth plan for 12 engineers — wants pricing for annual.", budget: 20000, currency: "USD", leadId: "ld_004", customerId: null, status: "new", requestedAt: reqHoursAgo(4), ownerName: "Lilit Sargsyan" },
  { id: "qr_005", orgId: "org_haydev", requesterName: "Elena Petrova", requesterEmail: "elena@quantedge.eu", company: "Quant Edge", description: "Scale plan for 60 seats, EMEA pricing, integrations pack.", budget: 200000, currency: "EUR", leadId: "ld_009", customerId: "cu_006", status: "quoted", requestedAt: reqAgo(8), ownerName: "Aram Hayrapetyan" },
  { id: "qr_006", orgId: "org_haydev", requesterName: "Anna Petrosyan", requesterEmail: "anna@petrosltd.am", company: "Petros Ltd", description: "Small team — 8 seats Growth + onboarding.", budget: 15000, currency: "USD", leadId: "ld_010", customerId: "cu_009", status: "new", requestedAt: reqHoursAgo(28), ownerName: "Lilit Sargsyan" },
  { id: "qr_007", orgId: "org_haydev", requesterName: "Maria Sokolova", requesterEmail: "maria@stellarworks.ru", company: "Stellar Works", description: "Growth plan for 28 seats — 1 year.", budget: 45000, currency: "USD", leadId: "ld_011", customerId: "cu_008", status: "lost", requestedAt: reqAgo(22), ownerName: "Tigran Gevorgyan" },
  { id: "qr_008", orgId: "org_haydev", requesterName: "Vardan Meridian", requesterEmail: "vardan@meridian.am", company: "Meridian", description: "Scale plan for 100 seats, audit module and custom Stripe integration.", budget: 350000, currency: "USD", leadId: "ld_012", customerId: "cu_010", status: "won", requestedAt: reqAgo(40), ownerName: "Aram Hayrapetyan" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve a quote's customer name from the linked lead or customer record. */
export function resolveQuoteParty(
  quote: MockQuote,
  leads: MockLead[] = mockLeads,
  customers: MockCustomer[] = mockCustomers,
): { name: string; kind: "customer" | "lead" | "walkin" } {
  if (quote.customerId) {
    const c = customers.find((x) => x.id === quote.customerId);
    if (c) return { name: c.name, kind: "customer" };
  }
  if (quote.leadId) {
    const l = leads.find((x) => x.id === quote.leadId);
    if (l) return { name: l.company ?? l.name, kind: "lead" };
  }
  return { name: "—", kind: "walkin" };
}

/** Resolve quote owner (rep) name from lead.ownerId — best-effort mapping. */
export function resolveQuoteOwner(quote: MockQuote): string {
  const map: Record<string, string> = {
    usr_owner: "Aram Hayrapetyan",
    usr_rep1: "Lilit Sargsyan",
    usr_rep2: "Tigran Gevorgyan",
  };
  // Heuristic: qt_001 → rep1, qt_002 → rep2, qt_003+ → owner
  if (quote.id === "qt_001" || quote.id === "qt_005" || quote.id === "qt_007") return map.usr_rep1;
  if (quote.id === "qt_002") return map.usr_rep2;
  return map.usr_owner;
}

/** Convert a MockQuote's items into LineItemInput[] for repricing with the engine. */
export function quoteToLineItems(quote: MockQuote) {
  return quote.items
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((it) => ({
      productId: it.id,
      productName: it.productName,
      qty: it.qty,
      unitPrice: it.unitPrice,
      discountType: "percent" as const,
      discount: 0,
    }));
}
