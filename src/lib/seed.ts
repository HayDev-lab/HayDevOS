/**
 * HayDevOS seed helper — optional. v1 powers the UI from in-memory mock
 * datasets in `src/lib/mock/*`. This file is kept for completeness so that
 * future agents (or a manual `bun run seed`) can hydrate the SQLite database
 * with the same shape of data.
 *
 * Usage:
 *   bun run -e "import('./src/lib/seed').then(m => m.seedDatabase())"
 */

import { db } from "@/lib/db";
import {
  mockLeads, mockQuotes, mockProducts, mockDocuments,
  mockAutomations, mockCustomers, mockInvoices, mockPayments,
  mockIntegrations, mockNotifications, mockAuditLogs,
} from "@/lib/mock";

const ORG_HAYDEV = "org_haydev";
const ORG_DEMO = "org_demo";
const USER_OWNER = "usr_owner";

export async function seedDatabase() {
  console.log("Seeding HayDevOS…");

  // Organizations
  await db.organization.upsert({
    where: { id: ORG_HAYDEV },
    update: {},
    create: { id: ORG_HAYDEV, name: "HayDev HQ", slug: "haydev-hq", plan: "enterprise" },
  });
  await db.organization.upsert({
    where: { id: ORG_DEMO },
    update: {},
    create: { id: ORG_DEMO, name: "Demo Corp", slug: "demo-corp", plan: "growth" },
  });

  // User + memberships
  await db.user.upsert({
    where: { email: "owner@haydev.os" },
    update: {},
    create: {
      id: USER_OWNER,
      email: "owner@haydev.os",
      name: "Aram Hayrapetyan",
      locale: "hy",
      defaultOrgId: ORG_HAYDEV,
    },
  });
  await db.membership.upsert({
    where: { userId_orgId: { userId: USER_OWNER, orgId: ORG_HAYDEV } },
    update: {},
    create: { userId: USER_OWNER, orgId: ORG_HAYDEV, role: "OWNER" },
  });
  await db.membership.upsert({
    where: { userId_orgId: { userId: USER_OWNER, orgId: ORG_DEMO } },
    update: {},
    create: { userId: USER_OWNER, orgId: ORG_DEMO, role: "OWNER" },
  });

  // Leads
  for (const l of mockLeads) {
    await db.lead.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id, orgId: l.orgId, name: l.name, email: l.email, phone: l.phone,
        company: l.company, source: l.source ?? null, stage: l.stage,
        ownerId: l.ownerId, value: l.value,
        firstResponseAt: l.firstResponseAt ? new Date(l.firstResponseAt) : null,
        lastActivityAt: new Date(l.lastActivityAt),
        slaDueAt: l.slaDueAt ? new Date(l.slaDueAt) : null,
        createdAt: new Date(l.createdAt),
      },
    });
  }

  // Products
  for (const p of mockProducts) {
    await db.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id, orgId: p.orgId, sku: p.sku, name: p.name, description: p.description,
        price: p.price, currency: p.currency, unit: p.unit, stock: p.stock,
      },
    });
  }

  // Customers
  for (const c of mockCustomers) {
    await db.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id, orgId: c.orgId, name: c.name, email: c.email, phone: c.phone,
        type: c.type, createdAt: new Date(c.createdAt),
      },
    });
  }

  // Invoices
  for (const i of mockInvoices) {
    await db.invoice.upsert({
      where: { id: i.id },
      update: {},
      create: {
        id: i.id, orgId: i.orgId, number: i.number, customerId: i.customerId,
        orderId: i.orderId, amount: i.amount, status: i.status,
        dueAt: i.dueAt ? new Date(i.dueAt) : null,
        createdAt: new Date(i.createdAt),
      },
    });
  }

  // Payments
  for (const p of mockPayments) {
    await db.payment.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id, orgId: p.orgId, invoiceId: p.invoiceId, amount: p.amount,
        method: p.method, paidAt: new Date(p.paidAt),
      },
    });
  }

  // Integrations
  for (const it of mockIntegrations) {
    await db.integration.upsert({
      where: { id: it.id },
      update: {},
      create: {
        id: it.id, orgId: it.orgId, provider: it.provider, status: it.status,
        lastSyncAt: it.lastSyncAt ? new Date(it.lastSyncAt) : null,
        createdAt: new Date(it.createdAt),
      },
    });
  }

  // Notifications
  for (const n of mockNotifications) {
    await db.notification.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id, orgId: n.orgId, userId: n.userId, type: n.type,
        title: n.titleKey, body: n.bodyKey, read: n.read, link: n.link,
        createdAt: new Date(n.createdAt),
      },
    });
  }

  // Audit logs
  for (const a of mockAuditLogs) {
    await db.auditLog.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id, orgId: a.orgId, userId: a.userId, action: a.actionKey,
        entityType: a.entityType, entityId: a.entityId,
        metadata: a.metadata ? JSON.stringify(a.metadata) : null,
        createdAt: new Date(a.createdAt),
      },
    });
  }

  // Quotes + items
  for (const q of mockQuotes) {
    await db.quote.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id, orgId: q.orgId, number: q.number, leadId: q.leadId,
        customerId: q.customerId, status: q.status, currency: q.currency,
        subtotal: q.subtotal, discount: q.discount, tax: q.tax, total: q.total,
        validUntil: new Date(q.validUntil), version: q.version, parentId: q.parentId,
        createdAt: new Date(q.createdAt),
      },
    });
    for (const qi of q.items) {
      await db.quoteItem.upsert({
        where: { id: qi.id },
        update: {},
        create: {
          id: qi.id, quoteId: q.id, productName: qi.productName, qty: qi.qty,
          unitPrice: qi.unitPrice, discount: qi.discount, total: qi.total,
          position: qi.position,
        },
      });
    }
  }

  // Documents + fields
  for (const d of mockDocuments) {
    await db.documentRecord.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id, orgId: d.orgId, filename: d.filename, mime: d.mime,
        size: d.size, status: d.status, uploadedById: d.uploadedById,
        batchId: d.batchId, classification: d.classification,
        createdAt: new Date(d.createdAt),
      },
    });
    for (const f of d.fields) {
      await db.documentField.create({
        data: {
          documentId: d.id, key: f.key, value: f.value,
          confidence: f.confidence, reviewed: f.reviewed,
        },
      });
    }
  }

  // Automations
  for (const a of mockAutomations) {
    await db.automation.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id, orgId: a.orgId, name: a.name, triggerType: a.triggerType,
        triggerConfig: a.triggerConfig ? JSON.stringify(a.triggerConfig) : null,
        conditionConfig: a.conditionConfig ? JSON.stringify(a.conditionConfig) : null,
        actionConfig: a.actionConfig ? JSON.stringify(a.actionConfig) : null,
        status: a.status, version: a.version,
        createdAt: new Date(a.createdAt),
      },
    });
  }

  console.log("Seed complete ✓");
}

// Allow running directly: `bun run src/lib/seed.ts`
if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
