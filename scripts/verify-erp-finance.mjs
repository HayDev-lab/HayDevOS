#!/usr/bin/env node
import { Prisma, PrismaClient } from "@prisma/client";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url || !/^postgres(?:ql)?:\/\//i.test(url)) throw new Error("DIRECT_URL or DATABASE_URL must be PostgreSQL.");
const db = new PrismaClient({ datasources: { db: { url } } });
let errors = 0;
try {
  const orders = await db.order.findMany({ include: { payments: { where: { status: "CONFIRMED" } }, financeEvents: true } });
  const results = [];
  for (const order of orders) {
    let received = new Prisma.Decimal(0); let refunded = new Prisma.Decimal(0); const unmatched = new Set();
    for (const payment of order.payments) {
      if (payment.currency !== order.currency) { unmatched.add(payment.currency); continue; }
      if (payment.type === "PAYMENT") received = received.plus(payment.amount); else refunded = refunded.plus(payment.amount);
      const expected = payment.type === "PAYMENT" ? "PAYMENT_RECEIVED" : "REFUND";
      if (!order.financeEvents.some((event) => event.paymentId === payment.id && event.type === expected && event.amount.eq(payment.amount) && event.currency === payment.currency)) {
        console.error(`MISSING_FINANCE_EVENT ${payment.id}`); errors++;
      }
    }
    const net = received.minus(refunded); const status = net.eq(0) ? "UNPAID" : net.lt(order.total) ? "PARTIALLY_PAID" : net.eq(order.total) ? "PAID" : "OVERPAID";
    results.push({ orderId: order.id, number: order.number, currency: order.currency, total: order.total.toString(), net: net.toString(), status, unmatchedCurrencies: [...unmatched] });
  }
  const orphanEvents = await db.$queryRaw`SELECT count(*)::int AS count FROM "FinanceEvent" f LEFT JOIN "Payment" p ON p."id"=f."paymentId" AND p."orgId"=f."orgId" WHERE f."paymentId" IS NOT NULL AND p."id" IS NULL`;
  if (Number(orphanEvents[0]?.count ?? 0) !== 0) { console.error("ORPHAN_FINANCE_EVENTS"); errors++; }
  console.log(JSON.stringify({ orders: results, errors, readOnly: true }, null, 2));
  if (errors) process.exitCode = 1;
} finally { await db.$disconnect(); }
