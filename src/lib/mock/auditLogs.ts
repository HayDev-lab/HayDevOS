import type { MockAuditLog } from "./types";

const ORG = "org_haydev";
const OWNER = "usr_owner";
const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 36000000).toISOString();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

/**
 * HayDevOS mock audit logs — i18n-key-based (Task 13b).
 *
 * Each entry stores an `actionKey` (resolved by AuditLogDialog via
 * `t(actionKey, locale, params)`) instead of a raw English string. Switching
 * language updates the action-label badges in the audit-log dialog on the
 * next render. Interpolation params (entity IDs, stage names, totals) are
 * passed via `params`; the matching audit.action.* keys live in
 * src/lib/i18n.ts.
 *
 * Note: `metadata` is preserved as-is for the seed path and any future
 * structured consumer; `params` is the i18n-shaped subset of the same data.
 */
export const mockAuditLogs: MockAuditLog[] = [
  {
    id: "al_001", orgId: ORG, userId: OWNER, userName: "Aram Hayrapetyan",
    actionKey: "audit.action.lead.stage_changed",
    params: { from: "negotiation", to: "won", value: 410000 },
    entityType: "lead", entityId: "ld_006",
    metadata: { from: "negotiation", to: "won", value: 410000 },
    createdAt: daysAgo(1),
  },
  {
    id: "al_002", orgId: ORG, userId: "usr_rep1", userName: "Rep 1",
    actionKey: "audit.action.quote.created",
    params: { number: "Q-2026-0144", total: 316240 },
    entityType: "quote", entityId: "qt_003",
    metadata: { number: "Q-2026-0144", total: 316240 },
    createdAt: daysAgo(2),
  },
  {
    id: "al_003", orgId: ORG, userId: "usr_rep2", userName: "Rep 2",
    actionKey: "audit.action.document.uploaded",
    params: { filename: "receipt_taxi_0921.jpg", classification: "receipt" },
    entityType: "document", entityId: "dc_003",
    metadata: { filename: "receipt_taxi_0921.jpg", classification: "receipt" },
    createdAt: hoursAgo(8),
  },
  {
    id: "al_004", orgId: ORG, userId: OWNER, userName: "Aram Hayrapetyan",
    actionKey: "audit.action.automation.paused",
    params: { name: "Weekly pipeline digest" },
    entityType: "automation", entityId: "au_006",
    metadata: { name: "Weekly pipeline digest" },
    createdAt: daysAgo(3),
  },
  {
    id: "al_005", orgId: ORG, userId: OWNER, userName: "Aram Hayrapetyan",
    actionKey: "audit.action.invoice.sent",
    params: { number: "INV-2026-0203", amount: 132000 },
    entityType: "invoice", entityId: "in_003",
    metadata: { number: "INV-2026-0203", amount: 132000 },
    createdAt: daysAgo(9),
  },
  {
    id: "al_006", orgId: ORG, userId: "usr_rep1", userName: "Rep 1",
    actionKey: "audit.action.document.approved",
    params: { filename: "invoice_ACME_2841.pdf" },
    entityType: "document", entityId: "dc_001",
    metadata: { filename: "invoice_ACME_2841.pdf" },
    createdAt: daysAgo(2),
  },
  {
    id: "al_007", orgId: ORG, userId: OWNER, userName: "Aram Hayrapetyan",
    actionKey: "audit.action.integration.connected",
    params: { provider: "stripe" },
    entityType: "integration", entityId: "ig_001",
    metadata: { provider: "stripe" },
    createdAt: daysAgo(90),
  },
  {
    id: "al_008", orgId: ORG, userId: "usr_rep2", userName: "Rep 2",
    actionKey: "audit.action.lead.assigned",
    params: { from: "usr_rep1", to: "usr_rep2" },
    entityType: "lead", entityId: "ld_005",
    metadata: { from: "usr_rep1", to: "usr_rep2" },
    createdAt: daysAgo(2),
  },
  {
    id: "al_009", orgId: ORG, userId: OWNER, userName: "Aram Hayrapetyan",
    actionKey: "audit.action.automation.created",
    params: { name: "Re-engage cold leads" },
    entityType: "automation", entityId: "au_009",
    metadata: { name: "Re-engage cold leads" },
    createdAt: daysAgo(2),
  },
  {
    id: "al_010", orgId: ORG, userId: OWNER, userName: "Aram Hayrapetyan",
    actionKey: "audit.action.member.invited",
    params: { role: "MEMBER", email: "rep2@haydev.os" },
    entityType: "membership", entityId: "usr_rep2",
    metadata: { role: "MEMBER", email: "rep2@haydev.os" },
    createdAt: daysAgo(14),
  },
  {
    id: "al_011", orgId: ORG, userId: "usr_rep1", userName: "Rep 1",
    actionKey: "audit.action.quote.sent",
    params: { number: "Q-2026-0142", total: 52800 },
    entityType: "quote", entityId: "qt_001",
    metadata: { number: "Q-2026-0142", total: 52800 },
    createdAt: daysAgo(5),
  },
  {
    id: "al_012", orgId: ORG, userId: OWNER, userName: "Aram Hayrapetyan",
    actionKey: "audit.action.settings.updated",
    params: { plan: "enterprise" },
    entityType: "organization", entityId: ORG,
    metadata: { fields: ["plan"], plan: "enterprise" },
    createdAt: minsAgo(45),
  },
];
