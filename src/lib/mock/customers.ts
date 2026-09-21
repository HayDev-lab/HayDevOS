import type { MockCustomer, MockOrder } from "./types";

const ORG = "org_haydev";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();

export const mockCustomers: MockCustomer[] = [
  { id: "cu_001", orgId: ORG, name: "Helix Corp", email: "ap@helixcorp.com", phone: "+1 212 555 0144", type: "business", createdAt: daysAgo(34), totalSpent: 448400, orderCount: 3 },
  { id: "cu_002", orgId: ORG, name: "Vortex Labs", email: "billing@vortex.am", phone: "+374 93 110 022", type: "business", createdAt: daysAgo(12), totalSpent: 0, orderCount: 0 },
  { id: "cu_003", orgId: ORG, name: "DataVault", email: "finance@datavault.io", phone: "+1 650 555 0177", type: "business", createdAt: daysAgo(45), totalSpent: 354000, orderCount: 2 },
  { id: "cu_004", orgId: ORG, name: "Markos Group", email: "davit@markosgroup.ru", phone: "+7 495 220 3344", type: "business", createdAt: daysAgo(10), totalSpent: 132000, orderCount: 1 },
  { id: "cu_005", orgId: ORG, name: "BrightPath", email: "lilit@brightpath.io", phone: "+1 415 555 0188", type: "business", createdAt: daysAgo(20), totalSpent: 0, orderCount: 0 },
  { id: "cu_006", orgId: ORG, name: "Quant Edge", email: "elena@quantedge.eu", phone: "+44 20 7946 0958", type: "business", createdAt: daysAgo(8), totalSpent: 0, orderCount: 0 },
  { id: "cu_007", orgId: ORG, name: "Gor Vardanyan", email: "gor@gmail.com", phone: "+374 99 555 211", type: "individual", createdAt: daysAgo(60), totalSpent: 1500, orderCount: 1 },
  { id: "cu_008", orgId: ORG, name: "Stellar Works", email: "maria@stellarworks.ru", phone: "+7 812 445 7788", type: "business", createdAt: daysAgo(6), totalSpent: 0, orderCount: 0 },
  { id: "cu_009", orgId: ORG, name: "Petros Ltd", email: "anna@petrosltd.am", phone: "+374 55 667 889", type: "business", createdAt: daysAgo(4), totalSpent: 0, orderCount: 0 },
  { id: "cu_010", orgId: ORG, name: "Meridian", email: "vardan@meridian.am", phone: "+374 60 555 100", type: "business", createdAt: daysAgo(2), totalSpent: 0, orderCount: 0 },
];

export const mockOrders: MockOrder[] = [
  { id: "or_001", orgId: ORG, number: "SO-2026-0089", customerId: "cu_001", status: "delivered", total: 448400, currency: "USD", createdAt: daysAgo(28) },
  { id: "or_002", orgId: ORG, number: "SO-2026-0090", customerId: "cu_003", status: "delivered", total: 354000, currency: "USD", createdAt: daysAgo(40) },
  { id: "or_003", orgId: ORG, number: "SO-2026-0091", customerId: "cu_004", status: "shipped", total: 132000, currency: "USD", createdAt: daysAgo(9) },
  { id: "or_004", orgId: ORG, number: "SO-2026-0092", customerId: "cu_007", status: "delivered", total: 1500, currency: "USD", createdAt: daysAgo(55) },
  { id: "or_005", orgId: ORG, number: "SO-2026-0093", customerId: "cu_001", status: "processing", total: 68000, currency: "USD", createdAt: daysAgo(2) },
  { id: "or_006", orgId: ORG, number: "SO-2026-0094", customerId: "cu_003", status: "pending", total: 44000, currency: "USD", createdAt: daysAgo(1) },
  { id: "or_007", orgId: ORG, number: "SO-2026-0095", customerId: "cu_004", status: "cancelled", total: 22000, currency: "USD", createdAt: daysAgo(15) },
];
