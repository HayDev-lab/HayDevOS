#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.HAYDEV_TEST_DATABASE_URL;
if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
  throw new Error("HAYDEV_TEST_DATABASE_URL must point to the isolated test PostgreSQL database.");
}
if (process.env.HAYDEV_TEST_DATABASE_CONFIRM !== "HAYDEVOS_ISOLATED_TEST_DATABASE") {
  throw new Error("HAYDEV_TEST_DATABASE_CONFIRM=HAYDEVOS_ISOLATED_TEST_DATABASE is required.");
}

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const suffix = `${Date.now()}_${process.pid}`;
const ids = {
  orgA: `isolation_org_a_${suffix}`,
  orgB: `isolation_org_b_${suffix}`,
  userA: `isolation_user_a_${suffix}`,
  userB: `isolation_user_b_${suffix}`,
  memberA: `isolation_member_a_${suffix}`,
  memberB: `isolation_member_b_${suffix}`,
  session: `isolation_session_${suffix}`,
  customer: `isolation_customer_${suffix}`,
  conversation: `isolation_conversation_${suffix}`,
  pipelineA: `isolation_pipeline_a_${suffix}`,
  pipelineB: `isolation_pipeline_b_${suffix}`,
  stageA: `isolation_stage_a_${suffix}`,
  stageB: `isolation_stage_b_${suffix}`,
  leadA: `isolation_lead_a_${suffix}`,
  leadB: `isolation_lead_b_${suffix}`,
  automation: `isolation_automation_${suffix}`,
  productA: `isolation_product_a_${suffix}`,
  productB: `isolation_product_b_${suffix}`,
  customerB: `isolation_customer_b_${suffix}`,
  orderA: `isolation_order_a_${suffix}`,
  warehouseA: `isolation_warehouse_a_${suffix}`,
  warehouseB: `isolation_warehouse_b_${suffix}`,
  balanceA: `isolation_balance_a_${suffix}`,
  movementA: `isolation_movement_a_${suffix}`,
  paymentA: `isolation_payment_a_${suffix}`,
  financeA: `isolation_finance_a_${suffix}`,
  erpEventA: `isolation_erp_event_a_${suffix}`,
  fulfillmentA: `isolation_fulfillment_a_${suffix}`,
  quoteA: `isolation_quote_a_${suffix}`,
  quoteB: `isolation_quote_b_${suffix}`,
  versionA: `isolation_version_a_${suffix}`,
  versionB: `isolation_version_b_${suffix}`,
  approvalA: `isolation_approval_a_${suffix}`,
  eventA: `isolation_quote_event_a_${suffix}`,
  documentA: `isolation_document_a_${suffix}`,
  documentB: `isolation_document_b_${suffix}`,
  documentVersionA: `isolation_document_version_a_${suffix}`,
};

async function expectRejected(label, operation) {
  try {
    await operation();
  } catch {
    console.log(`PASS: ${label}`);
    return;
  }
  throw new Error(`Expected rejection: ${label}`);
}

try {
  const [runtimeRole] = await db.$queryRawUnsafe(`
    SELECT
      rolsuper,
      rolcreatedb,
      rolcreaterole,
      rolbypassrls,
      has_schema_privilege('haydev_runtime', 'public', 'CREATE') AS can_create_schema_objects,
      has_table_privilege('haydev_runtime', 'public."User"', 'SELECT') AS can_select_users,
      has_table_privilege('haydev_runtime', 'public."_prisma_migrations"', 'SELECT') AS can_read_migrations
    FROM pg_roles
    WHERE rolname = 'haydev_runtime'
  `);

  if (
    !runtimeRole ||
    runtimeRole.rolsuper ||
    runtimeRole.rolcreatedb ||
    runtimeRole.rolcreaterole ||
    runtimeRole.rolbypassrls ||
    runtimeRole.can_create_schema_objects ||
    !runtimeRole.can_select_users ||
    runtimeRole.can_read_migrations
  ) {
    throw new Error("haydev_runtime privileges are not least-privilege.");
  }
  console.log("PASS: runtime role is restricted to application DML");

  await db.organization.createMany({
    data: [
      { id: ids.orgA, name: "Isolation A", slug: `isolation-a-${suffix}` },
      { id: ids.orgB, name: "Isolation B", slug: `isolation-b-${suffix}` },
    ],
  });
  await db.user.createMany({
    data: [
      { id: ids.userA, email: `isolation-a-${suffix}@example.invalid` },
      { id: ids.userB, email: `isolation-b-${suffix}@example.invalid` },
    ],
  });
  await db.membership.createMany({
    data: [
      { id: ids.memberA, userId: ids.userA, orgId: ids.orgA, role: "OWNER" },
      { id: ids.memberB, userId: ids.userB, orgId: ids.orgB, role: "OWNER" },
    ],
  });
  await db.leadPipeline.createMany({
    data: [
      { id: ids.pipelineA, orgId: ids.orgA, name: "Isolation Pipeline", isDefault: true },
      { id: ids.pipelineB, orgId: ids.orgB, name: "Isolation Pipeline", isDefault: true },
    ],
  });
  await db.leadPipelineStage.createMany({
    data: [
      { id: ids.stageA, orgId: ids.orgA, pipelineId: ids.pipelineA, key: "new", name: "New", position: 0 },
      { id: ids.stageB, orgId: ids.orgB, pipelineId: ids.pipelineB, key: "new", name: "New", position: 0 },
    ],
  });
  await db.leadSlaPolicy.createMany({ data: [{ orgId: ids.orgA }, { orgId: ids.orgB }] });
  await db.lead.create({
    data: {
      id: ids.leadA,
      orgId: ids.orgA,
      name: "Tenant A Lead",
      source: "web",
      externalId: "shared-external-id",
      pipelineId: ids.pipelineA,
      stageId: ids.stageA,
    },
  });
  await db.lead.create({
    data: {
      id: ids.leadB,
      orgId: ids.orgB,
      name: "Tenant B Lead",
      source: "web",
      externalId: "shared-external-id",
      pipelineId: ids.pipelineB,
      stageId: ids.stageB,
    },
  });
  console.log("PASS: cross-tenant lead dedup keys remain independent");

  await expectRejected("cross-tenant lead activity rejected", () =>
    db.leadActivity.create({
      data: { orgId: ids.orgB, leadId: ids.leadA, actorId: ids.userB, type: "note", body: "invalid" },
    }),
  );
  await expectRejected("cross-tenant lead task rejected", () =>
    db.task.create({
      data: { orgId: ids.orgB, leadId: ids.leadA, ownerId: ids.userB, createdById: ids.userB, title: "invalid" },
    }),
  );

  await db.session.create({
    data: {
      id: ids.session,
      userId: ids.userA,
      orgId: ids.orgA,
      token: `isolation-token-${suffix}`,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  console.log("PASS: same-tenant session accepted");

  await expectRejected("cross-tenant session rejected", () =>
    db.session.create({
      data: {
        id: `invalid_session_${suffix}`,
        userId: ids.userA,
        orgId: ids.orgB,
        token: `invalid-token-${suffix}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    }),
  );

  await db.customer.create({
    data: { id: ids.customer, orgId: ids.orgA, name: "Isolation Customer" },
  });
  await expectRejected("cross-tenant business relation rejected", () =>
    db.order.create({
      data: {
        id: `invalid_order_${suffix}`,
        orgId: ids.orgB,
        number: `INVALID-${suffix}`,
        customerId: ids.customer,
      },
    }),
  );

  await db.aiConversation.create({
    data: {
      id: ids.conversation,
      orgId: ids.orgA,
      userId: ids.userA,
      title: "Isolation test",
    },
  });
  await expectRejected("cross-tenant Owner AI user rejected", () =>
    db.aiConversation.create({
      data: {
        id: `invalid_conversation_${suffix}`,
        orgId: ids.orgA,
        userId: ids.userB,
        title: "Invalid isolation test",
      },
    }),
  );

  await db.webhookEvent.create({
    data: {
      id: `webhook_a_${suffix}`,
      orgId: ids.orgA,
      provider: "isolation-test",
      eventId: `event-${suffix}`,
    },
  });
  await expectRejected("duplicate tenant webhook rejected", () =>
    db.webhookEvent.create({
      data: {
        id: `webhook_b_${suffix}`,
        orgId: ids.orgA,
        provider: "isolation-test",
        eventId: `event-${suffix}`,
      },
    }),
  );
  await db.webhookEvent.create({
    data: {
      id: `webhook_cross_tenant_${suffix}`,
      orgId: ids.orgB,
      provider: "isolation-test",
      eventId: `event-${suffix}`,
    },
  });
  console.log("PASS: webhook idempotency key is tenant-scoped");

  await db.automation.create({
    data: { id: ids.automation, orgId: ids.orgA, name: "Isolation automation", triggerType: "LEAD_INGESTED", status: "active" },
  });
  const runs = await db.automationRun.createMany({
    data: [
      { orgId: ids.orgA, automationId: ids.automation, eventType: "lead.ingested", idempotencyKey: `lead.ingested:${ids.leadA}` },
      { orgId: ids.orgA, automationId: ids.automation, eventType: "lead.ingested", idempotencyKey: `lead.ingested:${ids.leadA}` },
    ],
    skipDuplicates: true,
  });
  if (runs.count !== 1) throw new Error(`Expected one idempotent automation run, created ${runs.count}`);
  console.log("PASS: automation replay queues one run");

  await db.product.create({ data: { id: ids.productA, orgId: ids.orgA, sku: `SKU-${suffix}`, name: "Tenant A Product", price: "10", currency: "USD" } });
  await db.quote.createMany({ data: [
    { id: ids.quoteA, orgId: ids.orgA, number: `QA-${suffix}`, customerName: "Tenant A", currency: "USD" },
    { id: ids.quoteB, orgId: ids.orgB, number: `QB-${suffix}`, customerName: "Tenant B", currency: "USD" },
  ] });
  await expectRejected("cross-tenant quote item rejected", () => db.quoteItem.create({ data: {
    orgId: ids.orgB, quoteId: ids.quoteA, productName: "Invalid", quantity: "1", unitPrice: "10", listPrice: "10",
  } }));
  await db.quoteVersion.createMany({ data: [
    { id: ids.versionA, orgId: ids.orgA, quoteId: ids.quoteA, versionNumber: 1, status: "draft", currency: "USD", customerSnapshot: {}, itemsSnapshot: [], quoteSnapshot: {}, subtotal: 0, lineDiscount: 0, quoteDiscount: 0, tax: 0, total: 0 },
    { id: ids.versionB, orgId: ids.orgB, quoteId: ids.quoteB, versionNumber: 1, status: "draft", currency: "USD", customerSnapshot: {}, itemsSnapshot: [], quoteSnapshot: {}, subtotal: 0, lineDiscount: 0, quoteDiscount: 0, tax: 0, total: 0 },
  ] });
  await expectRejected("cross-tenant quote version link rejected", () => db.quote.update({ where: { id: ids.quoteA }, data: { currentVersionId: ids.versionB } }));
  await expectRejected("cross-tenant quote approval rejected", () => db.quoteApproval.create({ data: {
    orgId: ids.orgB, quoteId: ids.quoteA, quoteVersionId: ids.versionA, requestedById: ids.userB,
  } }));
  await db.quoteApproval.create({ data: { id: ids.approvalA, orgId: ids.orgA, quoteId: ids.quoteA, quoteVersionId: ids.versionA, requestedById: ids.userA } });
  await expectRejected("approver outside quote tenant rejected", () => db.quoteApproval.update({ where: { id: ids.approvalA }, data: { status: "approved", decidedById: ids.userB, decidedAt: new Date() } }));
  await db.quoteEvent.create({ data: { id: ids.eventA, orgId: ids.orgA, quoteId: ids.quoteA, actorId: ids.userA, type: "test", body: "immutable" } });
  await expectRejected("runtime cannot mutate immutable quote version", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE haydev_runtime');
    await tx.quoteVersion.update({ where: { id: ids.versionA }, data: { notes: "forbidden" } });
  }));
  await expectRejected("runtime cannot delete immutable quote event", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE haydev_runtime');
    await tx.quoteEvent.delete({ where: { id: ids.eventA } });
  }));
  console.log("PASS: QuoteFlow tenant FKs and immutable history enforced in PostgreSQL");

  await db.customer.create({ data: { id: ids.customerB, orgId: ids.orgB, name: "Tenant B Customer" } });
  await db.product.create({ data: { id: ids.productB, orgId: ids.orgB, sku: `SKU-B-${suffix}`, name: "Tenant B Stock", type: "STOCKED_PRODUCT", price: "10", currency: "USD" } });
  await db.warehouse.createMany({ data: [
    { id: ids.warehouseA, orgId: ids.orgA, code: "MAIN", name: "Tenant A Main" },
    { id: ids.warehouseB, orgId: ids.orgB, code: "MAIN", name: "Tenant B Main" },
  ] });
  await db.order.create({ data: {
    id: ids.orderA, orgId: ids.orgA, number: `OA-${suffix}`, customerId: ids.customer,
    currency: "USD", subtotal: "10", total: "10", customerSnapshot: { name: "Isolation Customer" }, createdById: ids.userA,
    items: { create: { productId: ids.productA, productType: "NON_STOCKED_PRODUCT", name: "Snapshot", unit: "each", quantity: "1", unitPrice: "10", lineTotal: "10", currency: "USD" } },
  } });
  await expectRejected("cross-tenant ERP customer relation rejected", () => db.order.create({ data: {
    orgId: ids.orgB, number: `INVALID-ERP-${suffix}`, customerId: ids.customer,
    customerSnapshot: { name: "Invalid" }, currency: "USD",
  } }));
  await expectRejected("cross-tenant inventory relation rejected", () => db.inventoryBalance.create({ data: {
    orgId: ids.orgB, warehouseId: ids.warehouseB, productId: ids.productA,
  } }));
  await db.inventoryBalance.create({ data: { id: ids.balanceA, orgId: ids.orgA, warehouseId: ids.warehouseA, productId: ids.productA, onHand: "5", reserved: "0" } });
  await expectRejected("negative or over-reserved balance rejected", () => db.inventoryBalance.update({ where: { id: ids.balanceA }, data: { reserved: "6" } }));
  await db.inventoryMovement.create({ data: {
    id: ids.movementA, orgId: ids.orgA, warehouseId: ids.warehouseA, productId: ids.productA,
    type: "RECEIPT", quantity: "5", onHandDelta: "5", reservedDelta: "0", beforeOnHand: "0", afterOnHand: "5",
    beforeReserved: "0", afterReserved: "0", sourceType: "TEST", sourceId: ids.orderA, actorId: ids.userA,
  } });
  await expectRejected("runtime cannot mutate inventory ledger", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE haydev_runtime");
    await tx.inventoryMovement.update({ where: { id: ids.movementA }, data: { reason: "tampered" } });
  }));
  await expectRejected("runtime cannot mutate order snapshots", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE haydev_runtime");
    await tx.order.update({ where: { id: ids.orderA }, data: { total: "1", revision: { increment: 1 } } });
  }));
  await expectRejected("runtime order update requires exact revision increment", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE haydev_runtime");
    await tx.order.update({ where: { id: ids.orderA }, data: { status: "CANCELLED" } });
  }));
  await db.payment.create({ data: {
    id: ids.paymentA, orgId: ids.orgA, orderId: ids.orderA, amount: "10", currency: "USD", method: "bank",
    status: "CONFIRMED", recordedById: ids.userA, confirmedById: ids.userA, confirmedAt: new Date(),
  } });
  await expectRejected("runtime cannot edit confirmed payment", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE haydev_runtime");
    await tx.payment.update({ where: { id: ids.paymentA }, data: { reference: "tampered" } });
  }));
  await db.financeEvent.create({ data: { id: ids.financeA, orgId: ids.orgA, orderId: ids.orderA, paymentId: ids.paymentA, type: "PAYMENT_RECEIVED", amount: "10", currency: "USD", actorId: ids.userA } });
  await expectRejected("runtime cannot delete finance history", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE haydev_runtime");
    await tx.financeEvent.delete({ where: { id: ids.financeA } });
  }));
  await db.eRPEvent.create({ data: { id: ids.erpEventA, orgId: ids.orgA, aggregateType: "Order", aggregateId: ids.orderA, type: "order.test", payload: {}, actorId: ids.userA } });
  await expectRejected("runtime ERP outbox payload is immutable", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE haydev_runtime");
    await tx.eRPEvent.update({ where: { id: ids.erpEventA }, data: { payload: { tampered: true } } });
  }));
  await db.fulfillment.create({ data: { id: ids.fulfillmentA, orgId: ids.orgA, orderId: ids.orderA, number: "FUL-TEST", actorId: ids.userA } });
  await expectRejected("runtime fulfillment history is append-only", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL ROLE haydev_runtime");
    await tx.fulfillment.update({ where: { id: ids.fulfillmentA }, data: { note: "tampered" } });
  }));
  const [erpSecurity] = await db.$queryRawUnsafe(`
    SELECT
      (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgname IN
        ('Order_runtime_protected','OrderItem_runtime_immutable','InventoryMovement_runtime_immutable','Payment_runtime_protected','FinanceEvent_runtime_immutable','ERPEvent_runtime_protected')) AS trigger_count,
      (SELECT count(*)::int FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated') AND table_name IN
        ('Order','OrderItem','Warehouse','InventoryBalance','InventoryMovement','InventoryReservation','InventoryTransfer','Fulfillment','FulfillmentItem','Payment','FinanceEvent','ERPEvent')) AS browser_grants
  `);
  if (Number(erpSecurity?.trigger_count) !== 6 || Number(erpSecurity?.browser_grants) !== 0) throw new Error("ERP trigger/grant security boundary is incomplete.");
  console.log("PASS: ERP tenant FKs, database constraints, immutable ledgers, and browser grant boundary enforced");

  await db.documentRecord.createMany({ data: [
    { id: ids.documentA, orgId: ids.orgA, filename: "a.pdf", mime: "application/pdf", size: 12, status: "PENDING_SCAN", title: "Tenant A document", documentType: "upload", sourceType: "UPLOAD" },
    { id: ids.documentB, orgId: ids.orgB, filename: "b.pdf", mime: "application/pdf", size: 12, status: "PENDING_SCAN", title: "Tenant B document", documentType: "upload", sourceType: "UPLOAD" },
  ] });
  await expectRejected("cross-tenant order document source rejected", () => db.documentRecord.create({ data: {
    id: `invalid_order_document_${suffix}`, orgId: ids.orgB, filename: "order.pdf", mime: "application/pdf", size: 12,
    status: "PENDING_SCAN", documentType: "upload", sourceType: "ORDER", sourceId: ids.orderA,
  } }));
  await expectRejected("cross-tenant document source rejected", () => db.documentRecord.create({ data: {
    id: `invalid_source_document_${suffix}`, orgId: ids.orgB, filename: "quote.pdf", mime: "application/pdf", size: 12,
    status: "GENERATING", documentType: "quote_pdf", sourceType: "QUOTE", sourceId: ids.quoteA,
  } }));
  await db.documentVersion.create({ data: {
    id: ids.documentVersionA, orgId: ids.orgA, documentId: ids.documentA, versionNumber: 1,
    status: "PENDING_SCAN", storageBucket: "haydev-documents",
    storageKey: `organizations/${ids.orgA}/documents/${ids.documentA}/versions/${ids.documentVersionA}/a.pdf`,
    filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 12, sha256: "a".repeat(64), scanStatus: "PENDING_SCAN",
  } });
  await expectRejected("cross-tenant document version rejected", () => db.documentVersion.create({ data: {
    id: `invalid_document_version_${suffix}`, orgId: ids.orgB, documentId: ids.documentA, versionNumber: 2,
    status: "PENDING_SCAN", storageBucket: "haydev-documents",
    storageKey: `organizations/${ids.orgB}/documents/${ids.documentA}/versions/invalid_document_version_${suffix}/a.pdf`,
    filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 12, sha256: "b".repeat(64), scanStatus: "PENDING_SCAN",
  } }));
  await expectRejected("cross-tenant document access event rejected", () => db.documentAccessEvent.create({ data: {
    orgId: ids.orgB, documentId: ids.documentB, documentVersionId: ids.documentVersionA,
    actorId: ids.userB, action: "DOWNLOAD", outcome: "ALLOWED",
  } }));
  await expectRejected("runtime cannot mutate immutable document bytes metadata", () => db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE haydev_runtime');
    await tx.documentVersion.update({ where: { id: ids.documentVersionA }, data: { filename: "tampered.pdf" } });
  }));
  console.log("PASS: DocumentFlow tenant FKs, source guards, and immutable version metadata enforced in PostgreSQL");

  await db.membership.delete({ where: { id: ids.memberA } });
  const revokedSession = await db.session.findUnique({ where: { id: ids.session } });
  if (revokedSession !== null) {
    throw new Error("Deleting a membership did not revoke its organization session.");
  }
  console.log("PASS: membership removal revoked the organization session");
  console.log("PASS: PostgreSQL tenant-integrity suite completed");
} finally {
  await db.organization.deleteMany({ where: { id: { in: [ids.orgA, ids.orgB] } } });
  await db.user.deleteMany({ where: { id: { in: [ids.userA, ids.userB] } } });
  await db.$disconnect();
}
