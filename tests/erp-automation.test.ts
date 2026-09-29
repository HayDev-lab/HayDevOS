import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { PrismaClient } from "@prisma/client";

import { executeAutomationRun } from "@/lib/automations/executor";
import type { AuthContext } from "@/lib/auth/session";
import { executeTenantAction } from "@/lib/owner-ai/action-executor";
import { RISKY_ACTION_NAMES, SAFE_ACTION_NAMES } from "@/app/api/owner-ai/prompt";
import { withPersistentAuditStore } from "@/app/api/owner-ai/audit";
import { canErp } from "@/lib/erp/permissions";
import type { DomainContext } from "@/lib/erp/types";

setDefaultTimeout(30_000);

const db = new PrismaClient();
const suffix = `${Date.now()}_${process.pid}`;
const orgId = `erp_auto_org_${suffix}`; const userId = `erp_auto_user_${suffix}`;

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("ERP automation", () => {
  test("ERP RBAC keeps high-impact stock and payment decisions away from members", () => {
    const member = { userId: "member", orgId: "tenant", role: "MEMBER" } satisfies DomainContext;
    const manager = { userId: "manager", orgId: "tenant", role: "MANAGER" } satisfies DomainContext;
    const admin = { userId: "admin", orgId: "tenant", role: "ADMIN" } satisfies DomainContext;

    expect(canErp(member, "erp.read")).toBe(true);
    expect(canErp(member, "inventory.adjust")).toBe(false);
    expect(canErp(member, "payment.confirm")).toBe(false);
    expect(canErp(manager, "inventory.adjust")).toBe(false);
    expect(canErp(manager, "payment.confirm")).toBe(true);
    expect(canErp(admin, "inventory.adjust")).toBe(true);
  });

  test("Owner AI classifies ERP writes and rejects fabricated approval ids", async () => {
    expect(SAFE_ACTION_NAMES).toContain("createOrderFromQuote");
    expect(RISKY_ACTION_NAMES).toContain("confirmPayment");
    const context = {
      sessionId: "owner-ai-test", sessionTokenHash: "owner-ai-test", userId: "owner-ai-user", orgId: "owner-ai-org", role: "OWNER", expiresAt: new Date(Date.now() + 60_000),
      user: { id: "owner-ai-user", email: "owner-ai@example.invalid", name: "Owner AI", avatarUrl: "" }, organizations: [],
    } satisfies AuthContext;
    await expect(withPersistentAuditStore({ orgId: context.orgId, userId: context.userId }, () => executeTenantAction(context, "confirmPayment", { paymentId: "payment_test", __approvalId: "fabricated_approval" }))).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });
  });

  test("accepted quote replay creates exactly one order", async () => {
    await db.organization.create({ data: { id: orgId, name: "ERP automation", slug: `erp-auto-${suffix}` } });
    await db.user.create({ data: { id: userId, email: `erp-auto-${suffix}@example.invalid` } });
    await db.membership.create({ data: { orgId, userId, role: "OWNER" } });
    const quoteId = `erp_auto_quote_${suffix}`; const versionId = `erp_auto_version_${suffix}`;
    await db.quote.create({ data: { id: quoteId, orgId, number: `AUTO-${suffix}`, customerName: "Automation Customer", status: "accepted", currency: "USD", subtotal: "12", total: "12", acceptedAt: new Date() } });
    await db.quoteVersion.create({ data: {
      id: versionId, orgId, quoteId, versionNumber: 1, status: "accepted", currency: "USD",
      customerSnapshot: { name: "Automation Customer" },
      itemsSnapshot: [{ productId: null, productName: "Automation Service", description: null, unit: "each", quantity: "1", unitPrice: "12", discount: "0", quoteDiscountShare: "0", tax: "0", total: "12", position: 0 }],
      quoteSnapshot: {}, subtotal: "12", lineDiscount: "0", quoteDiscount: "0", tax: "0", total: "12",
    } });
    await db.quote.update({ where: { id: quoteId }, data: { currentVersionId: versionId, acceptedVersionId: versionId, currentVersionNumber: 1 } });
    const automation = await db.automation.create({ data: { orgId, name: "Quote to order", triggerType: "QUOTE_ACCEPTED", actionConfig: JSON.stringify({ action: "createOrderFromAcceptedQuote" }), status: "active" } });
    const run = await db.automationRun.create({ data: { orgId, automationId: automation.id, status: "queued", eventType: "quote.accepted", idempotencyKey: `quote.accepted:${quoteId}:${versionId}`, payload: JSON.stringify({ quoteId }) } });
    const context: AuthContext = {
      sessionId: "automation-test", sessionTokenHash: "automation-test", userId, orgId, role: "OWNER", expiresAt: new Date(Date.now() + 60_000),
      user: { id: userId, email: `erp-auto-${suffix}@example.invalid`, name: "Automation Owner", avatarUrl: "" },
      organizations: [{ id: orgId, name: "ERP automation", slug: `erp-auto-${suffix}`, plan: "starter", role: "OWNER" }],
    };
    const first = await executeAutomationRun(context, run.id);
    const replay = await executeAutomationRun(context, run.id);
    expect(first.action).toBe("createOrderFromAcceptedQuote");
    expect(replay.action).toBe("already_completed");
    expect(await db.order.count({ where: { orgId, sourceQuoteVersionId: versionId } })).toBe(1);
  });
});
