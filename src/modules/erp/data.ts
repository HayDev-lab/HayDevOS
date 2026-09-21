/**
 * ERP / CRM module — extended mock data.
 *
 * Re-uses the foundation mock datasets (`@/lib/mock`) and adds ERP-specific
 * extensions: credit limits, line items, fulfillment timelines, status
 * timelines, inventory movements, suppliers, purchase orders, and a financial
 * summary block.
 *
 * All records are org-scoped to `org_haydev`. No DB round-trip — the UI reads
 * from these in-memory datasets directly.
 */

import {
  mockCustomers as baseCustomers,
  mockOrders as baseOrders,
  mockInvoices as baseInvoices,
  mockPayments as basePayments,
  mockProducts as baseProducts,
  type MockCustomer,
  type MockOrder,
  type MockInvoice,
  type MockPayment,
  type MockProduct,
  type CustomerType,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/mock";

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const daysAhead = (d: number) => new Date(now + d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// Extended domain types
// ─────────────────────────────────────────────────────────────────────────────

export type { CustomerType, InvoiceStatus, PaymentMethod };

export type ErpOrderStatus =
  | "draft"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "pending"
  | "processing";

export type ErpProductStatus = "active" | "discontinued";
export type ErpMovementType = "in" | "out" | "adjust";
export type ErpPoStatus = "draft" | "sent" | "partial" | "received" | "cancelled";
export type ErpTaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface ErpOrderLineItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ErpOrderTimelineEvent {
  id: string;
  ts: string;
  label: string;
  tone: "lime" | "cyan" | "amber" | "rose" | "muted";
}

export interface ErpOrder extends Omit<MockOrder, "status"> {
  status: ErpOrderStatus;
  items: ErpOrderLineItem[];
  fulfillment: {
    method: string;
    carrier: string;
    tracking: string | null;
    eta: string | null;
    warehouse: string;
  };
  timeline: ErpOrderTimelineEvent[];
  notes?: string;
}

export interface ErpCustomer extends MockCustomer {
  status: "active" | "lead" | "blocked";
  creditLimit: number;
  outstandingBalance: number;
  notes: string;
  vatId?: string;
  country: string;
}

export interface ErpProduct extends MockProduct {
  cost: number;
  category: string;
  status: ErpProductStatus;
  reorderPoint: number;
  warehouseLocation: string;
  reserved: number;
  reservedPct?: number;
}

export interface ErpInvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ErpInvoiceTimelineEvent {
  id: string;
  ts: string;
  label: string;
  tone: "lime" | "cyan" | "amber" | "rose" | "muted";
}

export interface ErpInvoice extends Omit<MockInvoice, "status"> {
  status: InvoiceStatus | "cancelled";
  subtotal: number;
  taxRate: number;
  tax: number;
  paidAmount: number;
  lineItems: ErpInvoiceLineItem[];
  timeline: ErpInvoiceTimelineEvent[];
  issueDate: string;
  notes?: string;
}

export interface ErpPayment extends MockPayment {
  reference: string;
  customerId: string;
}

export interface ErpInventoryMovement {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  type: ErpMovementType;
  qty: number;
  reason: string;
  warehouse: string;
  ts: string;
  user: string;
}

export interface ErpSupplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  paymentTerms: string;
  rating: number;
  outstanding: number;
}

export interface ErpPurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  status: ErpPoStatus;
  total: number;
  currency: string;
  createdAt: string;
  expectedAt: string | null;
  items: { productId: string; name: string; qty: number; unitCost: number }[];
}

export interface ErpTask {
  id: string;
  title: string;
  status: ErpTaskStatus;
  priority: "low" | "medium" | "high" | "critical";
  assignee: string;
  due: string;
  module: string;
}

export interface ErpFinancialSummary {
  revenueMtd: number;
  revenueMtdDeltaPct: number;
  expenseMtd: number;
  cogsMtd: number;
  opexMtd: number;
  grossProfit: number;
  grossMarginPct: number;
  netProfit: number;
  netMarginPct: number;
  cashOnHand: number;
  arOutstanding: number;
  apOutstanding: number;
  openOrders: number;
  lowStockCount: number;
  agingBuckets: { current: number; d1_30: number; d31_60: number; d60plus: number };
  monthly: { month: string; revenue: number; expense: number }[];
}

export interface ErpIntegrationHealth {
  id: string;
  nameKey: string;
  descKey: string;
  status: "synced" | "degraded" | "error";
  lastSync: string;
  events: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const USD = "USD";

function lineTotal(qty: number, price: number) {
  return Math.round(qty * price * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customers (extended from base mock with creditLimit, balance, notes)
// ─────────────────────────────────────────────────────────────────────────────

export const erpCustomers: ErpCustomer[] = [
  {
    ...baseCustomers[0],
    status: "active",
    creditLimit: 600000,
    outstandingBalance: 68000,
    notes: "Net-30 terms. Strong payment history since 2024. Approve up to $100K orders without escalation.",
    country: "US",
    vatId: "US-HELIX-9981",
  },
  {
    ...baseCustomers[1],
    status: "lead",
    creditLimit: 25000,
    outstandingBalance: 52800,
    notes: "New logo — converted from LeadOS 12 days ago. Outstanding balance over credit limit; hold new orders.",
    country: "AM",
    vatId: "AM-VTX-2204",
  },
  {
    ...baseCustomers[2],
    status: "active",
    creditLimit: 400000,
    outstandingBalance: 44000,
    notes: "Pays via wire. Two open invoices, both within terms.",
    country: "US",
    vatId: "US-DVLT-7710",
  },
  {
    ...baseCustomers[3],
    status: "active",
    creditLimit: 200000,
    outstandingBalance: 66000,
    notes: "Pays in 2 partial installments. Russian entity — verify SWIFT before each invoice.",
    country: "RU",
    vatId: "RU-MRK-4451",
  },
  {
    ...baseCustomers[4],
    status: "lead",
    creditLimit: 50000,
    outstandingBalance: 90000,
    notes: "Recent inbound. Invoice drafted, awaiting customer confirmation before sending.",
    country: "US",
    vatId: "US-BP-1188",
  },
  {
    ...baseCustomers[5],
    status: "lead",
    creditLimit: 30000,
    outstandingBalance: 219660,
    notes: "EU entity — pays in EUR. One invoice open in EUR.",
    country: "EU",
    vatId: "EU-QE-9920",
  },
  {
    ...baseCustomers[6],
    status: "active",
    creditLimit: 5000,
    outstandingBalance: 0,
    notes: "Individual customer. Paid all invoices.",
    country: "AM",
  },
  {
    ...baseCustomers[7],
    status: "lead",
    creditLimit: 30000,
    outstandingBalance: 90440,
    notes: "EUR customer. Overdue — escalate to collections.",
    country: "RU",
    vatId: "RU-STW-2207",
  },
  {
    ...baseCustomers[8],
    status: "lead",
    creditLimit: 15000,
    outstandingBalance: 0,
    notes: "New account. No orders yet.",
    country: "AM",
    vatId: "AM-PET-5512",
  },
  {
    ...baseCustomers[9],
    status: "lead",
    creditLimit: 15000,
    outstandingBalance: 0,
    notes: "New account — onboarding in progress.",
    country: "AM",
    vatId: "AM-MER-1001",
  },
  {
    id: "cu_011",
    orgId: "org_haydev",
    name: "Atlas Systems",
    email: "ap@atlas.systems",
    phone: "+1 312 555 7788",
    type: "business",
    createdAt: daysAgo(120),
    totalSpent: 920000,
    orderCount: 6,
    status: "active",
    creditLimit: 1000000,
    outstandingBalance: 0,
    notes: "Top customer by ARR. Net-15 terms. Auto-billing enabled.",
    country: "US",
    vatId: "US-ATL-3344",
  },
  {
    id: "cu_012",
    orgId: "org_haydev",
    name: "Nairi Tech",
    email: "finance@nairi.am",
    phone: "+374 10 555 042",
    type: "business",
    createdAt: daysAgo(75),
    totalSpent: 178000,
    orderCount: 2,
    status: "active",
    creditLimit: 250000,
    outstandingBalance: 0,
    notes: "Local Armenian customer. Prefers AMD invoicing — converted to USD here.",
    country: "AM",
    vatId: "AM-NRT-7700",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Products (extended from base with cost/category/status/reorder/location)
// ─────────────────────────────────────────────────────────────────────────────

export const erpProducts: ErpProduct[] = baseProducts.map((p, i) => {
  const cost = Math.round(p.price * (0.32 + (i % 5) * 0.04) * 100) / 100;
  const category =
    i < 3 ? "License"
    : i < 5 ? "Add-on"
    : i < 8 ? "Service"
    : i < 11 ? "Module"
    : "Credits";
  const isStockItem = p.stock < 1000;
  const reorderPoint = isStockItem ? 4 + (i % 3) : 0;
  const stock = isStockItem ? Math.max(0, p.stock - (i % 5)) : p.stock;
  const reserved = isStockItem ? Math.min(stock, (i % 3) + 1) : 0;
  return {
    ...p,
    cost,
    category,
    status: "active",
    reorderPoint,
    warehouseLocation: `WH-${(i % 3) + 1}-Aisle-${String.fromCharCode(65 + (i % 6))}${1 + (i % 9)}`,
    stock,
    reserved,
  };
});

// Manually push a couple low-stock items
erpProducts[5].stock = 2;
erpProducts[5].reorderPoint = 6;
erpProducts[6].stock = 1;
erpProducts[6].reorderPoint = 4;
erpProducts[10].stock = 3;
erpProducts[10].reorderPoint = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Orders (extended with line items, fulfillment, timeline)
// ─────────────────────────────────────────────────────────────────────────────

export const erpOrders: ErpOrder[] = [
  {
    ...baseOrders[0],
    status: "delivered",
    items: [
      { id: "li_001", productId: "pr_001", name: erpProducts[0].name, sku: erpProducts[0].sku, qty: 100, unitPrice: 1500, total: lineTotal(100, 1500) },
      { id: "li_002", productId: "pr_004", name: erpProducts[3].name, sku: erpProducts[3].sku, qty: 50, unitPrice: 600, total: lineTotal(50, 600) },
      { id: "li_003", productId: "pr_006", name: erpProducts[5].name, sku: erpProducts[5].sku, qty: 1, unitPrice: 12000, total: lineTotal(1, 12000) },
    ],
    fulfillment: { method: "Air freight", carrier: "DHL Express", tracking: "1Z999AA10123456784", eta: daysAgo(20), warehouse: "WH-1" },
    timeline: [
      { id: "tl_001", ts: daysAgo(28), label: "Order created", tone: "lime" },
      { id: "tl_002", ts: daysAgo(27), label: "Confirmed", tone: "cyan" },
      { id: "tl_003", ts: daysAgo(24), label: "Picked & packed", tone: "cyan" },
      { id: "tl_004", ts: daysAgo(22), label: "Shipped", tone: "amber" },
      { id: "tl_005", ts: daysAgo(20), label: "Delivered", tone: "lime" },
    ],
    notes: "Multi-line enterprise rollout.",
  },
  {
    ...baseOrders[1],
    status: "delivered",
    items: [
      { id: "li_004", productId: "pr_002", name: erpProducts[1].name, sku: erpProducts[1].sku, qty: 120, unitPrice: 2200, total: lineTotal(120, 2200) },
      { id: "li_005", productId: "pr_009", name: erpProducts[8].name, sku: erpProducts[8].sku, qty: 1, unitPrice: 24000, total: lineTotal(1, 24000) },
      { id: "li_006", productId: "pr_012", name: erpProducts[11].name, sku: erpProducts[11].sku, qty: 12, unitPrice: 500, total: lineTotal(12, 500) },
    ],
    fulfillment: { method: "Ground", carrier: "FedEx", tracking: "7421 8364 5510", eta: daysAgo(36), warehouse: "WH-2" },
    timeline: [
      { id: "tl_010", ts: daysAgo(40), label: "Order created", tone: "lime" },
      { id: "tl_011", ts: daysAgo(39), label: "Confirmed", tone: "cyan" },
      { id: "tl_012", ts: daysAgo(36), label: "Delivered", tone: "lime" },
    ],
  },
  {
    ...baseOrders[2],
    status: "shipped",
    items: [
      { id: "li_007", productId: "pr_003", name: erpProducts[2].name, sku: erpProducts[2].sku, qty: 40, unitPrice: 3000, total: lineTotal(40, 3000) },
      { id: "li_008", productId: "pr_008", name: erpProducts[7].name, sku: erpProducts[7].sku, qty: 1, unitPrice: 10000, total: lineTotal(1, 10000) },
      { id: "li_009", productId: "pr_012", name: erpProducts[11].name, sku: erpProducts[11].sku, qty: 4, unitPrice: 500, total: lineTotal(4, 500) },
    ],
    fulfillment: { method: "Air freight", carrier: "UPS", tracking: "1Z999AA10123456790", eta: daysAgo(-1), warehouse: "WH-1" },
    timeline: [
      { id: "tl_020", ts: daysAgo(9), label: "Order created", tone: "lime" },
      { id: "tl_021", ts: daysAgo(8), label: "Confirmed", tone: "cyan" },
      { id: "tl_022", ts: daysAgo(3), label: "Shipped", tone: "amber" },
    ],
    notes: "Delivery expected today.",
  },
  {
    ...baseOrders[3],
    status: "delivered",
    items: [
      { id: "li_030", productId: "pr_001", name: erpProducts[0].name, sku: erpProducts[0].sku, qty: 1, unitPrice: 1500, total: lineTotal(1, 1500) },
    ],
    fulfillment: { method: "Email", carrier: "—", tracking: null, eta: daysAgo(55), warehouse: "—" },
    timeline: [
      { id: "tl_030", ts: daysAgo(55), label: "Order created", tone: "lime" },
      { id: "tl_031", ts: daysAgo(55), label: "Delivered (digital)", tone: "lime" },
    ],
  },
  {
    ...baseOrders[4],
    status: "processing",
    items: [
      { id: "li_040", productId: "pr_004", name: erpProducts[3].name, sku: erpProducts[3].sku, qty: 40, unitPrice: 600, total: lineTotal(40, 600) },
      { id: "li_041", productId: "pr_010", name: erpProducts[9].name, sku: erpProducts[9].sku, qty: 1, unitPrice: 50000, total: lineTotal(1, 50000) },
      { id: "li_042", productId: "pr_005", name: erpProducts[4].name, sku: erpProducts[4].sku, qty: 1, unitPrice: 28000, total: lineTotal(1, 28000) },
    ],
    fulfillment: { method: "Hybrid", carrier: "DHL + email", tracking: null, eta: daysAhead(3), warehouse: "WH-1" },
    timeline: [
      { id: "tl_040", ts: daysAgo(2), label: "Order created", tone: "lime" },
      { id: "tl_041", ts: daysAgo(2), label: "Confirmed", tone: "cyan" },
      { id: "tl_042", ts: hoursAgo(8), label: "Processing", tone: "amber" },
    ],
    notes: "Includes audit/compliance module + automation credits.",
  },
  {
    ...baseOrders[5],
    status: "pending",
    items: [
      { id: "li_050", productId: "pr_002", name: erpProducts[1].name, sku: erpProducts[1].sku, qty: 20, unitPrice: 2200, total: lineTotal(20, 2200) },
    ],
    fulfillment: { method: "Pending", carrier: "—", tracking: null, eta: null, warehouse: "—" },
    timeline: [
      { id: "tl_050", ts: daysAgo(1), label: "Order created", tone: "lime" },
      { id: "tl_051", ts: hoursAgo(4), label: "Awaiting confirmation", tone: "amber" },
    ],
  },
  {
    ...baseOrders[6],
    status: "cancelled",
    items: [
      { id: "li_060", productId: "pr_007", name: erpProducts[6].name, sku: erpProducts[6].sku, qty: 1, unitPrice: 44000, total: lineTotal(1, 44000) },
      { id: "li_061", productId: "pr_005", name: erpProducts[4].name, sku: erpProducts[4].sku, qty: 1, unitPrice: 28000, total: lineTotal(1, 28000) },
      { id: "li_062", productId: "pr_004", name: erpProducts[3].name, sku: erpProducts[3].sku, qty: 6, unitPrice: 600, total: lineTotal(6, 600) },
    ],
    fulfillment: { method: "—", carrier: "—", tracking: null, eta: null, warehouse: "—" },
    timeline: [
      { id: "tl_060", ts: daysAgo(15), label: "Order created", tone: "lime" },
      { id: "tl_061", ts: daysAgo(14), label: "Confirmed", tone: "cyan" },
      { id: "tl_062", ts: daysAgo(12), label: "Cancelled — out of stock", tone: "rose" },
    ],
    notes: "Cancelled by ops; re-create once SVC-ONB stock replenished.",
  },
  // Additional orders to meet 12+
  {
    id: "or_008", orgId: "org_haydev", number: "SO-2026-0096", customerId: "cu_011", status: "delivered", total: 480000, currency: USD, createdAt: daysAgo(85),
    items: [
      { id: "li_070", productId: "pr_003", name: erpProducts[2].name, sku: erpProducts[2].sku, qty: 80, unitPrice: 3000, total: lineTotal(80, 3000) },
      { id: "li_071", productId: "pr_010", name: erpProducts[9].name, sku: erpProducts[9].sku, qty: 1, unitPrice: 50000, total: lineTotal(1, 50000) },
      { id: "li_072", productId: "pr_005", name: erpProducts[4].name, sku: erpProducts[4].sku, qty: 1, unitPrice: 28000, total: lineTotal(1, 28000) },
    ],
    fulfillment: { method: "Air freight", carrier: "DHL", tracking: "1Z999AA10123456800", eta: daysAgo(80), warehouse: "WH-1" },
    timeline: [
      { id: "tl_070", ts: daysAgo(85), label: "Order created", tone: "lime" },
      { id: "tl_071", ts: daysAgo(80), label: "Delivered", tone: "lime" },
    ],
  },
  {
    id: "or_009", orgId: "org_haydev", number: "SO-2026-0097", customerId: "cu_012", status: "delivered", total: 178000, currency: USD, createdAt: daysAgo(70),
    items: [
      { id: "li_080", productId: "pr_002", name: erpProducts[1].name, sku: erpProducts[1].sku, qty: 70, unitPrice: 2200, total: lineTotal(70, 2200) },
      { id: "li_081", productId: "pr_008", name: erpProducts[7].name, sku: erpProducts[7].sku, qty: 1, unitPrice: 10000, total: lineTotal(1, 10000) },
      { id: "li_082", productId: "pr_012", name: erpProducts[11].name, sku: erpProducts[11].sku, qty: 16, unitPrice: 500, total: lineTotal(16, 500) },
    ],
    fulfillment: { method: "Local courier", carrier: "HayPost", tracking: "AM-5512", eta: daysAgo(65), warehouse: "WH-3" },
    timeline: [
      { id: "tl_080", ts: daysAgo(70), label: "Order created", tone: "lime" },
      { id: "tl_081", ts: daysAgo(65), label: "Delivered", tone: "lime" },
    ],
  },
  {
    id: "or_010", orgId: "org_haydev", number: "SO-2026-0098", customerId: "cu_011", status: "confirmed", total: 360000, currency: USD, createdAt: daysAgo(3),
    items: [
      { id: "li_090", productId: "pr_003", name: erpProducts[2].name, sku: erpProducts[2].sku, qty: 100, unitPrice: 3000, total: lineTotal(100, 3000) },
      { id: "li_091", productId: "pr_005", name: erpProducts[4].name, sku: erpProducts[4].sku, qty: 1, unitPrice: 28000, total: lineTotal(1, 28000) },
      { id: "li_092", productId: "pr_012", name: erpProducts[11].name, sku: erpProducts[11].sku, qty: 4, unitPrice: 500, total: lineTotal(4, 500) },
    ],
    fulfillment: { method: "Pending", carrier: "—", tracking: null, eta: daysAhead(5), warehouse: "WH-1" },
    timeline: [
      { id: "tl_090", ts: daysAgo(3), label: "Order created", tone: "lime" },
      { id: "tl_091", ts: daysAgo(2), label: "Confirmed", tone: "cyan" },
    ],
  },
  {
    id: "or_011", orgId: "org_haydev", number: "SO-2026-0099", customerId: "cu_001", status: "draft", total: 75000, currency: USD, createdAt: hoursAgo(20),
    items: [
      { id: "li_100", productId: "pr_004", name: erpProducts[3].name, sku: erpProducts[3].sku, qty: 50, unitPrice: 600, total: lineTotal(50, 600) },
      { id: "li_101", productId: "pr_011", name: erpProducts[10].name, sku: erpProducts[10].sku, qty: 1, unitPrice: 25000, total: lineTotal(1, 25000) },
      { id: "li_102", productId: "pr_005", name: erpProducts[4].name, sku: erpProducts[4].sku, qty: 1, unitPrice: 28000, total: lineTotal(1, 28000) },
    ],
    fulfillment: { method: "—", carrier: "—", tracking: null, eta: null, warehouse: "—" },
    timeline: [
      { id: "tl_100", ts: hoursAgo(20), label: "Draft created", tone: "muted" },
    ],
    notes: "Pending approval — custom integration scope.",
  },
  {
    id: "or_012", orgId: "org_haydev", number: "SO-2026-0100", customerId: "cu_003", status: "shipped", total: 99000, currency: USD, createdAt: daysAgo(5),
    items: [
      { id: "li_110", productId: "pr_001", name: erpProducts[0].name, sku: erpProducts[0].sku, qty: 40, unitPrice: 1500, total: lineTotal(40, 1500) },
      { id: "li_111", productId: "pr_012", name: erpProducts[11].name, sku: erpProducts[11].sku, qty: 12, unitPrice: 500, total: lineTotal(12, 500) },
      { id: "li_112", productId: "pr_005", name: erpProducts[4].name, sku: erpProducts[4].sku, qty: 1, unitPrice: 28000, total: lineTotal(1, 28000) },
    ],
    fulfillment: { method: "Air freight", carrier: "FedEx", tracking: "5512-9981-AM", eta: daysAhead(2), warehouse: "WH-2" },
    timeline: [
      { id: "tl_110", ts: daysAgo(5), label: "Order created", tone: "lime" },
      { id: "tl_111", ts: daysAgo(4), label: "Confirmed", tone: "cyan" },
      { id: "tl_112", ts: daysAgo(1), label: "Shipped", tone: "amber" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Invoices (extended with line items, timeline, paidAmount)
// ─────────────────────────────────────────────────────────────────────────────

export const erpInvoices: ErpInvoice[] = [
  {
    ...baseInvoices[0],
    status: "paid",
    subtotal: 407636,
    taxRate: 0.1,
    tax: 40764,
    paidAmount: 448400,
    lineItems: [
      { id: "iv_li_001", description: "HayDevOS Growth — annual × 100 seats", qty: 100, unitPrice: 1500, total: 150000 },
      { id: "iv_li_002", description: "DocSmart add-on × 50 seats", qty: 50, unitPrice: 600, total: 30000 },
      { id: "iv_li_003", description: "Implementation package", qty: 1, unitPrice: 12000, total: 12000 },
      { id: "iv_li_004", description: "Premium support — annual", qty: 1, unitPrice: 10000, total: 10000 },
      { id: "iv_li_005", description: "Connect integrations pack", qty: 1, unitPrice: 24000, total: 24000 },
      { id: "iv_li_006", description: "Audit & compliance module", qty: 1, unitPrice: 50000, total: 50000 },
      { id: "iv_li_007", description: "Custom integration (bespoke)", qty: 1, unitPrice: 25000, total: 25000 },
      { id: "iv_li_008", description: "AI credits — 10K × 6", qty: 6, unitPrice: 500, total: 3000 },
      { id: "iv_li_009", description: "Autopilot flow credits", qty: 1, unitPrice: 28000, total: 28000 },
      { id: "iv_li_010", description: "Onboarding & training", qty: 1, unitPrice: 44000, total: 44000 },
    ],
    timeline: [
      { id: "iv_tl_001", ts: daysAgo(28), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_002", ts: daysAgo(27), label: "Sent to customer", tone: "cyan" },
      { id: "iv_tl_003", ts: daysAgo(22), label: "Payment received in full", tone: "lime" },
    ],
    issueDate: daysAgo(28),
    notes: "Auto-generated from SO-2026-0089.",
  },
  {
    ...baseInvoices[1],
    status: "paid",
    subtotal: 321818,
    taxRate: 0.1,
    tax: 32182,
    paidAmount: 354000,
    lineItems: [
      { id: "iv_li_020", description: "HayDevOS Scale — annual × 120 seats", qty: 120, unitPrice: 2200, total: 264000 },
      { id: "iv_li_021", description: "Connect integrations pack", qty: 1, unitPrice: 24000, total: 24000 },
      { id: "iv_li_022", description: "AI credits — 10K × 12", qty: 12, unitPrice: 500, total: 6000 },
      { id: "iv_li_023", description: "Onboarding & training", qty: 1, unitPrice: 44000, total: 44000 },
    ],
    timeline: [
      { id: "iv_tl_020", ts: daysAgo(40), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_021", ts: daysAgo(39), label: "Sent", tone: "cyan" },
      { id: "iv_tl_022", ts: daysAgo(32), label: "Paid in full", tone: "lime" },
    ],
    issueDate: daysAgo(40),
  },
  {
    ...baseInvoices[2],
    status: "sent",
    subtotal: 120000,
    taxRate: 0.1,
    tax: 12000,
    paidAmount: 0,
    lineItems: [
      { id: "iv_li_030", description: "HayDevOS Enterprise — annual × 40 seats", qty: 40, unitPrice: 3000, total: 120000 },
    ],
    timeline: [
      { id: "iv_tl_030", ts: daysAgo(9), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_031", ts: daysAgo(8), label: "Sent", tone: "cyan" },
    ],
    issueDate: daysAgo(9),
    notes: "Awaiting payment — net-15.",
  },
  {
    ...baseInvoices[3],
    status: "paid",
    subtotal: 1364,
    taxRate: 0.1,
    tax: 136,
    paidAmount: 1500,
    lineItems: [
      { id: "iv_li_040", description: "HayDevOS Growth — annual × 1 seat", qty: 1, unitPrice: 1500, total: 1500 },
    ],
    timeline: [
      { id: "iv_tl_040", ts: daysAgo(55), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_041", ts: daysAgo(55), label: "Sent", tone: "cyan" },
      { id: "iv_tl_042", ts: daysAgo(52), label: "Paid in full", tone: "lime" },
    ],
    issueDate: daysAgo(55),
  },
  {
    ...baseInvoices[4],
    status: "draft",
    subtotal: 61818,
    taxRate: 0.1,
    tax: 6182,
    paidAmount: 0,
    lineItems: [
      { id: "iv_li_050", description: "DocSmart add-on × 40 seats", qty: 40, unitPrice: 600, total: 24000 },
      { id: "iv_li_051", description: "Audit & compliance module", qty: 1, unitPrice: 50000, total: 50000 },
    ],
    timeline: [
      { id: "iv_tl_050", ts: daysAgo(2), label: "Draft created", tone: "muted" },
    ],
    issueDate: daysAgo(2),
  },
  {
    ...baseInvoices[5],
    status: "sent",
    subtotal: 40000,
    taxRate: 0.1,
    tax: 4000,
    paidAmount: 0,
    lineItems: [
      { id: "iv_li_060", description: "HayDevOS Scale — annual × 20 seats", qty: 20, unitPrice: 2200, total: 44000 },
    ],
    timeline: [
      { id: "iv_tl_060", ts: daysAgo(1), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_061", ts: hoursAgo(20), label: "Sent", tone: "cyan" },
    ],
    issueDate: daysAgo(1),
  },
  {
    ...baseInvoices[6],
    status: "overdue",
    subtotal: 48000,
    taxRate: 0.1,
    tax: 4800,
    paidAmount: 0,
    lineItems: [
      { id: "iv_li_070", description: "HayDevOS Growth — annual × 32 seats", qty: 32, unitPrice: 1500, total: 48000 },
    ],
    timeline: [
      { id: "iv_tl_070", ts: daysAgo(15), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_071", ts: daysAgo(14), label: "Sent", tone: "cyan" },
      { id: "iv_tl_072", ts: daysAgo(5), label: "Past due — reminder sent", tone: "rose" },
    ],
    issueDate: daysAgo(15),
    notes: "Customer balance exceeds credit limit.",
  },
  {
    ...baseInvoices[7],
    status: "draft",
    subtotal: 81818,
    taxRate: 0.1,
    tax: 8182,
    paidAmount: 0,
    lineItems: [
      { id: "iv_li_080", description: "HayDevOS Enterprise — annual × 30 seats", qty: 30, unitPrice: 3000, total: 90000 },
    ],
    timeline: [
      { id: "iv_tl_080", ts: hoursAgo(6), label: "Draft created", tone: "muted" },
    ],
    issueDate: hoursAgo(6),
  },
  {
    ...baseInvoices[8],
    status: "sent",
    subtotal: 199691,
    taxRate: 0.1,
    tax: 19969,
    paidAmount: 0,
    lineItems: [
      { id: "iv_li_090", description: "HayDevOS Enterprise — annual × 50 seats (EUR)", qty: 50, unitPrice: 3993.82, total: 199691 },
    ],
    timeline: [
      { id: "iv_tl_090", ts: daysAgo(7), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_091", ts: daysAgo(7), label: "Sent", tone: "cyan" },
    ],
    issueDate: daysAgo(7),
  },
  {
    ...baseInvoices[9],
    status: "overdue",
    subtotal: 82218,
    taxRate: 0.1,
    tax: 8222,
    paidAmount: 0,
    lineItems: [
      { id: "iv_li_100", description: "HayDevOS Scale — annual × 41 seats (EUR)", qty: 41, unitPrice: 2205.46, total: 90440 },
    ],
    timeline: [
      { id: "iv_tl_100", ts: daysAgo(35), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_101", ts: daysAgo(34), label: "Sent", tone: "cyan" },
      { id: "iv_tl_102", ts: daysAgo(2), label: "Past due", tone: "rose" },
    ],
    issueDate: daysAgo(35),
    notes: "Collections escalation required.",
  },
  // Extra invoices to hit 10+ with cancelled status
  {
    id: "in_011", orgId: "org_haydev", number: "INV-2026-0211", customerId: "cu_001", orderId: "or_005",
    amount: 68000, currency: USD, status: "sent", dueAt: daysAhead(20), createdAt: daysAgo(2),
    subtotal: 61818, taxRate: 0.1, tax: 6182, paidAmount: 0,
    lineItems: [
      { id: "iv_li_110", description: "DocSmart add-on × 40 seats", qty: 40, unitPrice: 600, total: 24000 },
      { id: "iv_li_111", description: "Audit & compliance module", qty: 1, unitPrice: 50000, total: 50000 },
    ],
    timeline: [
      { id: "iv_tl_110", ts: daysAgo(2), label: "Invoice created", tone: "muted" },
      { id: "iv_tl_111", ts: daysAgo(2), label: "Sent", tone: "cyan" },
    ],
    issueDate: daysAgo(2),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Payments (extended with reference + customerId)
// ─────────────────────────────────────────────────────────────────────────────

export const erpPayments: ErpPayment[] = [
  { ...basePayments[0], reference: "WIRE-CHS-9981", customerId: "cu_001" },
  { ...basePayments[1], reference: "CARD-VTX-2204", customerId: "cu_003" },
  { ...basePayments[2], reference: "CARD-GOR-211", customerId: "cu_007" },
  { ...basePayments[3], reference: "WIRE-MRK-1", customerId: "cu_004" },
  { ...basePayments[4], reference: "WIRE-MRK-2", customerId: "cu_004" },
  // Additional payments
  {
    id: "pa_006", orgId: "org_haydev", invoiceId: "in_011", amount: 34000, currency: USD, method: "card",
    paidAt: hoursAgo(12), reference: "CARD-HELIX-PARTIAL", customerId: "cu_001",
  },
  {
    id: "pa_007", orgId: "org_haydev", invoiceId: "in_009", amount: 99900, currency: "EUR", method: "bank",
    paidAt: daysAgo(4), reference: "SEPA-QE-50PCT", customerId: "cu_006",
  },
  {
    id: "pa_008", orgId: "org_haydev", invoiceId: "in_010", amount: 45000, currency: "EUR", method: "crypto",
    paidAt: daysAgo(8), reference: "USDC-STW-PARTIAL", customerId: "cu_008",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Inventory movements
// ─────────────────────────────────────────────────────────────────────────────

export const erpInventoryMovements: ErpInventoryMovement[] = [
  { id: "im_001", productId: "pr_006", sku: "SVC-IMPL", productName: "Implementation package", type: "out", qty: 1, reason: "Allocated to SO-2026-0089", warehouse: "WH-1", ts: daysAgo(28), user: "aram" },
  { id: "im_002", productId: "pr_006", sku: "SVC-IMPL", productName: "Implementation package", type: "in", qty: 4, reason: "Quarterly capacity replenishment", warehouse: "WH-1", ts: daysAgo(40), user: "nairi" },
  { id: "im_003", productId: "pr_007", sku: "SVC-ONB", productName: "Onboarding & training", type: "out", qty: 1, reason: "Allocated to SO-2026-0095 (cancelled)", warehouse: "WH-2", ts: daysAgo(14), user: "aram" },
  { id: "im_004", productId: "pr_007", sku: "SVC-ONB", productName: "Onboarding & training", type: "adjust", qty: -1, reason: "Cancelled order release", warehouse: "WH-2", ts: daysAgo(12), user: "nairi" },
  { id: "im_005", productId: "pr_011", sku: "INT-CUSTOM", productName: "Custom integration", type: "out", qty: 1, reason: "Allocated to SO-2026-0098", warehouse: "WH-3", ts: daysAgo(2), user: "aram" },
  { id: "im_006", productId: "pr_011", sku: "INT-CUSTOM", productName: "Custom integration", type: "in", qty: 2, reason: "Engineering capacity added", warehouse: "WH-3", ts: daysAgo(20), user: "nairi" },
  { id: "im_007", productId: "pr_005", sku: "ADD-AUTOPILOT", productName: "Autopilot flow credits", type: "out", qty: 1, reason: "Allocated to SO-2026-0098", warehouse: "WH-1", ts: daysAgo(2), user: "aram" },
  { id: "im_008", productId: "pr_005", sku: "ADD-AUTOPILOT", productName: "Autopilot flow credits", type: "in", qty: 5, reason: "Vendor restock", warehouse: "WH-1", ts: daysAgo(30), user: "nairi" },
  { id: "im_009", productId: "pr_010", sku: "ADD-AUDIT", productName: "Audit & compliance module", type: "out", qty: 1, reason: "Allocated to SO-2026-0093", warehouse: "WH-1", ts: daysAgo(2), user: "aram" },
  { id: "im_010", productId: "pr_010", sku: "ADD-AUDIT", productName: "Audit & compliance module", type: "in", qty: 3, reason: "Vendor restock", warehouse: "WH-1", ts: daysAgo(45), user: "nairi" },
  { id: "im_011", productId: "pr_006", sku: "SVC-IMPL", productName: "Implementation package", type: "out", qty: 1, reason: "Allocated to SO-2026-0096", warehouse: "WH-1", ts: daysAgo(85), user: "aram" },
  { id: "im_012", productId: "pr_006", sku: "SVC-IMPL", productName: "Implementation package", type: "in", qty: 3, reason: "Vendor restock", warehouse: "WH-1", ts: daysAgo(90), user: "nairi" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Suppliers & purchase orders
// ─────────────────────────────────────────────────────────────────────────────

export const erpSuppliers: ErpSupplier[] = [
  { id: "su_001", name: "Cloud Vendor Inc.", email: "ap@cloudvendor.com", phone: "+1 415 555 9100", country: "US", paymentTerms: "Net-30", rating: 4.8, outstanding: 48000 },
  { id: "su_002", name: "Armenia Outsourcing LLC", email: "finance@armout.am", phone: "+374 10 555 220", country: "AM", paymentTerms: "Net-15", rating: 4.6, outstanding: 12000 },
  { id: "su_003", name: "EU Services B.V.", email: "billing@euservices.nl", phone: "+31 20 555 8899", country: "EU", paymentTerms: "Net-45", rating: 4.9, outstanding: 0 },
  { id: "su_004", name: "Global Logistics Co.", email: "ap@globalogistics.com", phone: "+1 312 555 4400", country: "US", paymentTerms: "Net-30", rating: 4.4, outstanding: 8500 },
];

export const erpPurchaseOrders: ErpPurchaseOrder[] = [
  {
    id: "po_001", number: "PO-2026-0042", supplierId: "su_001", supplierName: "Cloud Vendor Inc.",
    status: "sent", total: 48000, currency: USD, createdAt: daysAgo(5), expectedAt: daysAhead(7),
    items: [
      { productId: "pr_005", name: "Autopilot flow credits", qty: 5, unitCost: 8000 },
      { productId: "pr_010", name: "Audit & compliance module", qty: 1, unitCost: 8000 },
    ],
  },
  {
    id: "po_002", number: "PO-2026-0043", supplierId: "su_002", supplierName: "Armenia Outsourcing LLC",
    status: "partial", total: 12000, currency: USD, createdAt: daysAgo(10), expectedAt: daysAhead(2),
    items: [
      { productId: "pr_006", name: "Implementation package", qty: 4, unitCost: 3000 },
    ],
  },
  {
    id: "po_003", number: "PO-2026-0044", supplierId: "su_003", supplierName: "EU Services B.V.",
    status: "draft", total: 9000, currency: USD, createdAt: hoursAgo(6), expectedAt: null,
    items: [
      { productId: "pr_011", name: "Custom integration", qty: 3, unitCost: 3000 },
    ],
  },
  {
    id: "po_004", number: "PO-2026-0045", supplierId: "su_001", supplierName: "Cloud Vendor Inc.",
    status: "received", total: 16000, currency: USD, createdAt: daysAgo(40), expectedAt: daysAgo(20),
    items: [
      { productId: "pr_007", name: "Onboarding & training", qty: 4, unitCost: 4000 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Operations tasks
// ─────────────────────────────────────────────────────────────────────────────

export const erpTasks: ErpTask[] = [
  { id: "tk_001", title: "Pack SO-2026-0097 for HayPost pickup", status: "in_progress", priority: "high", assignee: "Nairi M.", due: daysAhead(1), module: "erp" },
  { id: "tk_002", title: "Confirm SWIFT for Markos Group payment", status: "todo", priority: "critical", assignee: "Aram H.", due: daysAgo(-2), module: "erp" },
  { id: "tk_003", title: "Reconcile EUR invoice INV-2026-0210", status: "todo", priority: "high", assignee: "Finance Bot", due: daysAhead(3), module: "erp" },
  { id: "tk_004", title: "Issue PO for low-stock SVC-ONB", status: "todo", priority: "medium", assignee: "Nairi M.", due: daysAhead(4), module: "erp" },
  { id: "tk_005", title: "Send reminder for INV-2026-0207 (overdue)", status: "in_progress", priority: "high", assignee: "Aram H.", due: daysAgo(0), module: "erp" },
  { id: "tk_006", title: "Approve draft invoice INV-2026-0208", status: "blocked", priority: "medium", assignee: "Aram H.", due: daysAhead(2), module: "erp" },
  { id: "tk_007", title: "Quarterly inventory count — WH-2", status: "todo", priority: "low", assignee: "Nairi M.", due: daysAhead(10), module: "erp" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Integration health cards
// ─────────────────────────────────────────────────────────────────────────────

export const erpIntegrationHealth: ErpIntegrationHealth[] = [
  { id: "int_control", nameKey: "erp.integrations.control", descKey: "erp.integrations.control.desc", status: "synced", lastSync: hoursAgo(1), events: 2481 },
  { id: "int_quoteflow", nameKey: "erp.integrations.quoteflow", descKey: "erp.integrations.quoteflow.desc", status: "synced", lastSync: hoursAgo(2), events: 318 },
  { id: "int_docflow", nameKey: "erp.integrations.docflow", descKey: "erp.integrations.docflow.desc", status: "synced", lastSync: hoursAgo(3), events: 902 },
  { id: "int_autopilot", nameKey: "erp.integrations.autopilot", descKey: "erp.integrations.autopilot.desc", status: "degraded", lastSync: hoursAgo(5), events: 1755 },
  { id: "int_leados", nameKey: "erp.integrations.leados", descKey: "erp.integrations.leados.desc", status: "synced", lastSync: hoursAgo(1), events: 442 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Financial summary
// ─────────────────────────────────────────────────────────────────────────────

export const erpFinancialSummary: ErpFinancialSummary = {
  revenueMtd: 1298400,
  revenueMtdDeltaPct: 12.4,
  expenseMtd: 921000,
  cogsMtd: 482000,
  opexMtd: 439000,
  grossProfit: 816400,
  grossMarginPct: 62.9,
  netProfit: 377400,
  netMarginPct: 29.1,
  cashOnHand: 2840000,
  arOutstanding: 615800,
  apOutstanding: 72500,
  openOrders: 3,
  lowStockCount: 3,
  agingBuckets: { current: 382400, d1_30: 142860, d31_60: 0, d60plus: 90540 },
  monthly: [
    { month: "jan", revenue: 980000, expense: 720000 },
    { month: "feb", revenue: 1120000, expense: 780000 },
    { month: "mar", revenue: 1050000, expense: 810000 },
    { month: "apr", revenue: 1240000, expense: 850000 },
    { month: "may", revenue: 1180000, expense: 880000 },
    { month: "jun", revenue: 1298400, expense: 921000 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

export function customerById(id: string): ErpCustomer | undefined {
  return erpCustomers.find((c) => c.id === id);
}

export function customerName(id: string): string {
  return customerById(id)?.name ?? "—";
}

export function productById(id: string): ErpProduct | undefined {
  return erpProducts.find((p) => p.id === id);
}

export function invoiceById(id: string): ErpInvoice | undefined {
  return erpInvoices.find((i) => i.id === id);
}

export function orderById(id: string): ErpOrder | undefined {
  return erpOrders.find((o) => o.id === id);
}

export function paymentsForInvoice(invoiceId: string): ErpPayment[] {
  return erpPayments.filter((p) => p.invoiceId === invoiceId);
}

export function ordersForCustomer(customerId: string): ErpOrder[] {
  return erpOrders.filter((o) => o.customerId === customerId);
}

export function invoicesForCustomer(customerId: string): ErpInvoice[] {
  return erpInvoices.filter((i) => i.customerId === customerId);
}

export function paymentsForCustomer(customerId: string): ErpPayment[] {
  return erpPayments.filter((p) => p.customerId === customerId);
}

export function invoiceAgingBucket(invoice: ErpInvoice): "current" | "1_30" | "31_60" | "60plus" {
  if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "draft") return "current";
  if (!invoice.dueAt) return "current";
  const dueMs = new Date(invoice.dueAt).getTime();
  const diffDays = Math.floor((now - dueMs) / 86400000);
  if (diffDays <= 0) return "current";
  if (diffDays <= 30) return "1_30";
  if (diffDays <= 60) return "31_60";
  return "60plus";
}

export function invoiceOutstanding(invoice: ErpInvoice): number {
  return Math.max(0, Math.round((invoice.amount - invoice.paidAmount) * 100) / 100);
}

export function lowStockProducts(): ErpProduct[] {
  return erpProducts.filter((p) => p.reorderPoint > 0 && p.stock <= p.reorderPoint);
}

export function openOrdersCount(): number {
  return erpOrders.filter((o) => o.status === "pending" || o.status === "confirmed" || o.status === "processing" || o.status === "shipped").length;
}

export function productMarginPct(p: ErpProduct): number {
  if (p.price <= 0) return 0;
  return Math.round(((p.price - p.cost) / p.price) * 1000) / 10;
}
