import type { MockQuote } from "./types";

const ORG = "org_haydev";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const daysAhead = (d: number) => new Date(now + d * 86400000).toISOString();

export const mockQuotes: MockQuote[] = [
  {
    id: "qt_001", orgId: ORG, number: "Q-2026-0142", leadId: "ld_001", customerId: null,
    status: "sent", currency: "USD", subtotal: 48000, discount: 4000, tax: 8800, total: 52800,
    validUntil: daysAhead(21), version: 1, parentId: null,
    items: [
      { id: "qi_1", productName: "HayDevOS Growth — annual", qty: 24, unitPrice: 1500, discount: 0, total: 36000, position: 0 },
      { id: "qi_2", productName: "Implementation package", qty: 1, unitPrice: 12000, discount: 0, total: 12000, position: 1 },
    ],
    createdAt: daysAgo(5),
  },
  {
    id: "qt_002", orgId: ORG, number: "Q-2026-0143", leadId: "ld_002", customerId: null,
    status: "accepted", currency: "USD", subtotal: 122000, discount: 12000, tax: 22000, total: 132000,
    validUntil: daysAhead(7), version: 2, parentId: "qt_002_v1",
    items: [
      { id: "qi_3", productName: "HayDevOS Scale — annual", qty: 40, unitPrice: 2200, discount: 0, total: 88000, position: 0 },
      { id: "qi_4", productName: "DocSmart add-on", qty: 40, unitPrice: 600, discount: 0, total: 24000, position: 1 },
      { id: "qi_5", productName: "Premium support", qty: 1, unitPrice: 10000, discount: 0, total: 10000, position: 2 },
    ],
    createdAt: daysAgo(9),
  },
  {
    id: "qt_003", orgId: ORG, number: "Q-2026-0144", leadId: "ld_003", customerId: null,
    status: "draft", currency: "USD", subtotal: 268000, discount: 0, tax: 48240, total: 316240,
    validUntil: daysAhead(30), version: 1, parentId: null,
    items: [
      { id: "qi_6", productName: "HayDevOS Enterprise — annual", qty: 80, unitPrice: 3000, discount: 0, total: 240000, position: 0 },
      { id: "qi_7", productName: "Autopilot flow credits", qty: 1, unitPrice: 28000, discount: 0, total: 28000, position: 1 },
    ],
    createdAt: daysAgo(2),
  },
  {
    id: "qt_004", orgId: ORG, number: "Q-2026-0145", leadId: "ld_009", customerId: null,
    status: "sent", currency: "EUR", subtotal: 198000, discount: 15000, tax: 36660, total: 219660,
    validUntil: daysAhead(14), version: 1, parentId: null,
    items: [
      { id: "qi_8", productName: "HayDevOS Scale — annual", qty: 60, unitPrice: 2900, discount: 0, total: 174000, position: 0 },
      { id: "qi_9", productName: "Connect integrations pack", qty: 1, unitPrice: 24000, discount: 0, total: 24000, position: 1 },
    ],
    createdAt: daysAgo(7),
  },
  {
    id: "qt_005", orgId: ORG, number: "Q-2026-0146", leadId: "ld_007", customerId: null,
    status: "expired", currency: "EUR", subtotal: 76000, discount: 0, tax: 14440, total: 90440,
    validUntil: daysAgo(3), version: 1, parentId: null,
    items: [
      { id: "qi_10", productName: "HayDevOS Growth — annual", qty: 40, unitPrice: 1900, discount: 0, total: 76000, position: 0 },
    ],
    createdAt: daysAgo(35),
  },
  {
    id: "qt_006", orgId: ORG, number: "Q-2026-0147", leadId: "ld_006", customerId: "cu_001",
    status: "accepted", currency: "USD", subtotal: 410000, discount: 30000, tax: 68400, total: 448400,
    validUntil: daysAhead(0), version: 3, parentId: "qt_006_v2",
    items: [
      { id: "qi_11", productName: "HayDevOS Enterprise — annual", qty: 120, unitPrice: 2800, discount: 0, total: 336000, position: 0 },
      { id: "qi_12", productName: "Onboarding & training", qty: 1, unitPrice: 44000, discount: 0, total: 44000, position: 1 },
      { id: "qi_13", productName: "DocSmart + Autopilot bundle", qty: 1, unitPrice: 30000, discount: 0, total: 30000, position: 2 },
    ],
    createdAt: daysAgo(28),
  },
  {
    id: "qt_007", orgId: ORG, number: "Q-2026-0148", leadId: "ld_011", customerId: null,
    status: "rejected", currency: "USD", subtotal: 42000, discount: 0, tax: 7980, total: 49980,
    validUntil: daysAgo(2), version: 1, parentId: null,
    items: [
      { id: "qi_14", productName: "HayDevOS Growth — annual", qty: 28, unitPrice: 1500, discount: 0, total: 42000, position: 0 },
    ],
    createdAt: daysAgo(20),
  },
  {
    id: "qt_008", orgId: ORG, number: "Q-2026-0149", leadId: "ld_012", customerId: "cu_003",
    status: "accepted", currency: "USD", subtotal: 325000, discount: 25000, tax: 54000, total: 354000,
    validUntil: daysAhead(10), version: 2, parentId: "qt_008_v1",
    items: [
      { id: "qi_15", productName: "HayDevOS Scale — annual", qty: 100, unitPrice: 2500, discount: 0, total: 250000, position: 0 },
      { id: "qi_16", productName: "Audit & compliance module", qty: 1, unitPrice: 50000, discount: 0, total: 50000, position: 1 },
      { id: "qi_17", productName: "Custom integration — Stripe", qty: 1, unitPrice: 25000, discount: 0, total: 25000, position: 2 },
    ],
    createdAt: daysAgo(40),
  },
];
