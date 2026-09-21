import type { MockIntegration } from "./types";

const ORG = "org_haydev";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

export const mockIntegrations: MockIntegration[] = [
  {
    id: "ig_001", orgId: ORG, provider: "stripe",
    status: "connected", lastSyncAt: minsAgo(3), eventsProcessed: 18429,
    createdAt: daysAgo(90),
  },
  {
    id: "ig_002", orgId: ORG, provider: "hubspot",
    status: "connected", lastSyncAt: hoursAgo(1), eventsProcessed: 9412,
    createdAt: daysAgo(60),
  },
  {
    id: "ig_003", orgId: ORG, provider: "slack",
    status: "connected", lastSyncAt: minsAgo(1), eventsProcessed: 22018,
    createdAt: daysAgo(120),
  },
  {
    id: "ig_004", orgId: ORG, provider: "gmail",
    status: "degraded", lastSyncAt: hoursAgo(6), eventsProcessed: 5210,
    createdAt: daysAgo(45),
  },
  {
    id: "ig_005", orgId: ORG, provider: "quickbooks",
    status: "reauth_required", lastSyncAt: daysAgo(3), eventsProcessed: 1842,
    createdAt: daysAgo(30),
  },
  {
    id: "ig_006", orgId: ORG, provider: "zapier",
    status: "connected", lastSyncAt: hoursAgo(2), eventsProcessed: 7341,
    createdAt: daysAgo(75),
  },
  {
    id: "ig_007", orgId: ORG, provider: "meta",
    status: "error", lastSyncAt: daysAgo(1), eventsProcessed: 921,
    createdAt: daysAgo(20),
  },
  {
    id: "ig_008", orgId: ORG, provider: "google",
    status: "disconnected", lastSyncAt: null, eventsProcessed: 0,
    createdAt: daysAgo(10),
  },
];
