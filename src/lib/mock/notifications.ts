import type { MockNotification } from "./types";

const ORG = "org_haydev";
const OWNER = "usr_owner";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 36000000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

/**
 * HayDevOS mock notifications — i18n-key-based (Task 13).
 *
 * Each notification stores a `titleKey` + `bodyKey` (resolved by the
 * NotificationsPopover via `t(key, locale, params)`) instead of literal
 * English strings. Switching language updates the popover text on the next
 * open. Number/entity interpolations are passed via `params`.
 *
 * Title/body keys live under `notifications.title.*` / `notifications.body.*`
 * in src/lib/i18n.ts. Keep the keys in sync across all three locales.
 */
export const mockNotifications: MockNotification[] = [
  {
    id: "no_001", orgId: ORG, userId: OWNER, type: "sla",
    titleKey: "notifications.title.sla_breach",
    bodyKey: "notifications.body.sla_breach",
    params: { name: "Anna Petrosyan", company: "Petros Ltd", sla: "4h", owner: "Rep 2" },
    read: false, link: "leados/ld_005", createdAt: hoursAgo(1),
  },
  {
    id: "no_002", orgId: ORG, userId: OWNER, type: "success",
    titleKey: "notifications.title.deal_won",
    bodyKey: "notifications.body.deal_won",
    params: { name: "Tigran Sargsyan", company: "Helix Corp", amount: "$410,000" },
    read: false, link: "leados/ld_006", createdAt: daysAgo(1),
  },
  {
    id: "no_003", orgId: ORG, userId: OWNER, type: "mention",
    titleKey: "notifications.title.mention",
    bodyKey: "notifications.body.mention",
    params: { actor: "Rep 1", lead: "Vortex Labs" },
    read: false, link: "leados/ld_001", createdAt: hoursAgo(3),
  },
  {
    id: "no_004", orgId: ORG, userId: OWNER, type: "warning",
    titleKey: "notifications.title.reauth",
    bodyKey: "notifications.body.reauth",
    params: { provider: "QuickBooks" },
    read: false, link: "connect/quickbooks", createdAt: hoursAgo(8),
  },
  {
    id: "no_005", orgId: ORG, userId: OWNER, type: "info",
    titleKey: "notifications.title.quote_accepted",
    bodyKey: "notifications.body.quote_accepted",
    params: { number: "Q-2026-0143", company: "Markos Group", amount: "$132,000" },
    read: true, link: "quoteflow/qt_002", createdAt: daysAgo(2),
  },
  {
    id: "no_006", orgId: ORG, userId: OWNER, type: "system",
    titleKey: "notifications.title.digest",
    bodyKey: "notifications.body.digest",
    params: { pct: "12%", n: 3 },
    read: true, link: "control", createdAt: daysAgo(3),
  },
  {
    id: "no_007", orgId: ORG, userId: OWNER, type: "error",
    titleKey: "notifications.title.automation_failed",
    bodyKey: "notifications.body.automation_failed",
    params: { name: "Sync Stripe payments to ERP", count: 3 },
    read: false, link: "autopilot/au_007", createdAt: minsAgo(18),
  },
  {
    id: "no_008", orgId: ORG, userId: OWNER, type: "success",
    titleKey: "notifications.title.doc_approved",
    bodyKey: "notifications.body.doc_approved",
    params: { filename: "invoice_ACME_2841.pdf" },
    read: true, link: "docsmart/dc_001", createdAt: daysAgo(2),
  },
  {
    id: "no_009", orgId: ORG, userId: OWNER, type: "info",
    titleKey: "notifications.title.new_lead",
    bodyKey: "notifications.body.new_lead",
    params: { name: "Vardan Khachatryan", company: "Meridian" },
    read: false, link: "leados/ld_010", createdAt: hoursAgo(1),
  },
  {
    id: "no_010", orgId: ORG, userId: OWNER, type: "sla",
    titleKey: "notifications.title.sla_at_risk",
    bodyKey: "notifications.body.sla_at_risk",
    params: { lead: "Vortex Labs", hours: 2 },
    read: false, link: "leados/ld_001", createdAt: minsAgo(40),
  },
];
