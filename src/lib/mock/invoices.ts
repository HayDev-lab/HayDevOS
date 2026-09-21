import type { MockInvoice, MockPayment } from "./types";

const ORG = "org_haydev";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const daysAhead = (d: number) => new Date(now + d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();

export const mockInvoices: MockInvoice[] = [
  { id: "in_001", orgId: ORG, number: "INV-2026-0201", customerId: "cu_001", orderId: "or_001", amount: 448400, currency: "USD", status: "paid", dueAt: daysAgo(20), createdAt: daysAgo(28) },
  { id: "in_002", orgId: ORG, number: "INV-2026-0202", customerId: "cu_003", orderId: "or_002", amount: 354000, currency: "USD", status: "paid", dueAt: daysAgo(30), createdAt: daysAgo(40) },
  { id: "in_003", orgId: ORG, number: "INV-2026-0203", customerId: "cu_004", orderId: "or_003", amount: 132000, currency: "USD", status: "sent", dueAt: daysAhead(12), createdAt: daysAgo(9) },
  { id: "in_004", orgId: ORG, number: "INV-2026-0204", customerId: "cu_007", orderId: "or_004", amount: 1500, currency: "USD", status: "paid", dueAt: daysAgo(50), createdAt: daysAgo(55) },
  { id: "in_005", orgId: ORG, number: "INV-2026-0205", customerId: "cu_001", orderId: "or_005", amount: 68000, currency: "USD", status: "draft", dueAt: daysAhead(30), createdAt: daysAgo(2) },
  { id: "in_006", orgId: ORG, number: "INV-2026-0206", customerId: "cu_003", orderId: "or_006", amount: 44000, currency: "USD", status: "sent", dueAt: daysAhead(21), createdAt: daysAgo(1) },
  { id: "in_007", orgId: ORG, number: "INV-2026-0207", customerId: "cu_002", orderId: null, amount: 52800, currency: "USD", status: "overdue", dueAt: daysAgo(5), createdAt: daysAgo(15) },
  { id: "in_008", orgId: ORG, number: "INV-2026-0208", customerId: "cu_005", orderId: null, amount: 90000, currency: "USD", status: "draft", dueAt: daysAhead(30), createdAt: hoursAgo(6) },
  { id: "in_009", orgId: ORG, number: "INV-2026-0209", customerId: "cu_006", orderId: null, amount: 219660, currency: "EUR", status: "sent", dueAt: daysAhead(7), createdAt: daysAgo(7) },
  { id: "in_010", orgId: ORG, number: "INV-2026-0210", customerId: "cu_008", orderId: null, amount: 90440, currency: "EUR", status: "overdue", dueAt: daysAgo(2), createdAt: daysAgo(35) },
];

export const mockPayments: MockPayment[] = [
  { id: "pa_001", orgId: ORG, invoiceId: "in_001", amount: 448400, currency: "USD", method: "bank", paidAt: daysAgo(22) },
  { id: "pa_002", orgId: ORG, invoiceId: "in_002", amount: 354000, currency: "USD", method: "card", paidAt: daysAgo(32) },
  { id: "pa_003", orgId: ORG, invoiceId: "in_004", amount: 1500, currency: "USD", method: "card", paidAt: daysAgo(52) },
  { id: "pa_004", orgId: ORG, invoiceId: "in_003", amount: 66000, currency: "USD", method: "bank", paidAt: daysAgo(4) },
  { id: "pa_005", orgId: ORG, invoiceId: "in_003", amount: 66000, currency: "USD", method: "bank", paidAt: daysAgo(2) },
];
