/**
 * Shared mock data types for HayDevOS v1.
 * These mirror the Prisma schema but are simple in-memory records so the UI
 * can render without hitting the database.
 */

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type LeadSource = "web" | "referral" | "outbound" | "inbound" | "event" | "partner";

export interface MockLead {
  id: string;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: LeadSource;
  stage: LeadStage;
  ownerId: string;
  value: number;
  currency: string;
  firstResponseAt: string | null;
  lastActivityAt: string;
  slaDueAt: string | null;
  slaBreached?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockLeadActivity {
  id: string;
  leadId: string;
  orgId: string;
  type: "note" | "call" | "email" | "meeting" | "status_change" | "system";
  body: string;
  createdAt: string;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export interface MockQuoteItem {
  id: string;
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
  position: number;
}

export interface MockQuote {
  id: string;
  orgId: string;
  number: string;
  leadId: string | null;
  customerId: string | null;
  status: QuoteStatus;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  validUntil: string;
  version: number;
  parentId: string | null;
  items: MockQuoteItem[];
  createdAt: string;
}

export interface MockProduct {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  unit: string;
  stock: number;
}

export type DocumentStatus =
  | "pending"
  | "processing"
  | "classified"
  | "extracted"
  | "reviewed"
  | "approved"
  | "rejected";

export type DocumentClass = "invoice" | "contract" | "receipt" | "id" | "form" | "other";

export interface MockDocumentField {
  key: string;
  value: string;
  confidence: number;
  reviewed: boolean;
}

export interface MockDocument {
  id: string;
  orgId: string;
  filename: string;
  mime: string;
  size: number;
  status: DocumentStatus;
  uploadedById: string;
  batchId: string | null;
  classification: DocumentClass | null;
  fields: MockDocumentField[];
  createdAt: string;
}

export type AutomationStatus = "draft" | "active" | "paused";
export type AutomationTriggerType =
  | "lead_created"
  | "quote_accepted"
  | "doc_uploaded"
  | "sla_breach"
  | "schedule"
  | "manual";

export interface MockAutomation {
  id: string;
  orgId: string;
  name: string;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown> | null;
  conditionConfig: Record<string, unknown> | null;
  actionConfig: Record<string, unknown> | null;
  status: AutomationStatus;
  version: number;
  runs: { total: number; success: number; failed: number; lastRunAt: string | null };
  createdAt: string;
}

export type CustomerType = "individual" | "business";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type PaymentMethod = "card" | "bank" | "cash" | "crypto" | "wallet";

export interface MockCustomer {
  id: string;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: CustomerType;
  createdAt: string;
  totalSpent: number;
  orderCount: number;
}

export interface MockOrder {
  id: string;
  orgId: string;
  number: string;
  customerId: string;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: string;
}

export interface MockInvoice {
  id: string;
  orgId: string;
  number: string;
  customerId: string;
  orderId: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueAt: string | null;
  createdAt: string;
}

export interface MockPayment {
  id: string;
  orgId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paidAt: string;
}

export type IntegrationProvider =
  | "stripe"
  | "hubspot"
  | "slack"
  | "gmail"
  | "quickbooks"
  | "zapier"
  | "meta"
  | "google";

export type IntegrationStatus =
  | "connected"
  | "degraded"
  | "reauth_required"
  | "error"
  | "disconnected";

export interface MockIntegration {
  id: string;
  orgId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  lastSyncAt: string | null;
  eventsProcessed: number;
  createdAt: string;
}

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "mention"
  | "sla"
  | "system";

export interface MockNotification {
  id: string;
  orgId: string;
  userId: string;
  type: NotificationType;
  /** i18n key for the title (e.g. "notifications.title.sla_breach"). */
  titleKey: string;
  /** i18n key for the body (e.g. "notifications.body.sla_breach"). */
  bodyKey: string;
  /** Interpolation params for both title and body. */
  params?: Record<string, string | number>;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface MockAuditLog {
  id: string;
  orgId: string;
  userId: string;
  userName: string;
  /** i18n key for the action label (e.g. "audit.action.lead.stage_changed"). */
  actionKey: string;
  /** Interpolation params for the action label (e.g. { from, to, value }). */
  params?: Record<string, string | number>;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MockKpi {
  id: string;
  label: string;
  labelKey: string;
  value: number;
  displayValue: string;
  deltaPct: number;
  tone: "lime" | "cyan" | "amber" | "rose" | "violet";
  sparkline: number[];
}

export interface MockKpiGroup {
  category: "revenue" | "pipeline" | "operations" | "automation";
  kpis: MockKpi[];
}
