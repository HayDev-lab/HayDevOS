import "server-only";

import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { appendAudit, appendErpEvent, decimalString, newId, serializable } from "./common";
import { requireErpPermission, requireOwnerAiApproval } from "./permissions";
import type { PaymentInput, PaymentListInput } from "./schemas";
import type { DomainContext } from "./types";

function paymentDto(row: Prisma.PaymentGetPayload<Record<string, never>>) {
  return {
    ...row, amount: decimalString(row.amount), paidAt: row.paidAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null, voidedAt: row.voidedAt?.toISOString() ?? null,
  };
}

async function getPaymentRow(context: DomainContext, paymentId: string) {
  const row = await getDb().payment.findFirst({ where: { id: paymentId, orgId: context.orgId } });
  if (!row) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  return row;
}

export async function recordPayment(context: DomainContext, input: PaymentInput) {
  requireErpPermission(context, "payment.record");
  const id = await serializable(async (tx) => {
    if (context.idempotencyKey) {
      const existing = await tx.payment.findUnique({ where: { orgId_idempotencyKey: { orgId: context.orgId, idempotencyKey: context.idempotencyKey } } });
      if (existing) return existing.id;
    }
    const order = await tx.order.findFirst({ where: { id: input.orderId, orgId: context.orgId, archivedAt: null }, select: { id: true } });
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
    if (input.invoiceId) {
      const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, orgId: context.orgId, orderId: input.orderId }, select: { id: true } });
      if (!invoice) throw new ApiError(422, "INVALID_INVOICE", "Invoice does not belong to this order and organization");
    }
    const row = await tx.payment.create({ data: {
      id: newId("payment"), orgId: context.orgId, orderId: input.orderId, invoiceId: input.invoiceId ?? null,
      amount: new Prisma.Decimal(input.amount), currency: input.currency, method: input.method,
      reference: input.reference ?? null, recordedById: context.userId, idempotencyKey: context.idempotencyKey ?? null,
    } });
    await appendAudit(tx, context, "payment.recorded", "Payment", row.id, { orderId: input.orderId, amount: input.amount, currency: input.currency });
    return row.id;
  });
  return paymentDto(await getPaymentRow(context, id));
}

export async function confirmPayment(context: DomainContext, paymentId: string, reason?: string) {
  requireErpPermission(context, "payment.confirm");
  requireOwnerAiApproval(context, "payment confirmation");
  await serializable(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id"::text FROM "Payment" WHERE "id" = ${paymentId} AND "orgId" = ${context.orgId} FOR UPDATE`);
    const row = await tx.payment.findFirst({ where: { id: paymentId, orgId: context.orgId } });
    if (!row) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (row.status === "CONFIRMED") return;
    if (row.status !== "PENDING") throw new ApiError(409, "PAYMENT_FINAL", "Only a pending payment can be confirmed");
    const now = new Date();
    await tx.payment.update({ where: { id: row.id }, data: { status: "CONFIRMED", confirmedAt: now, confirmedById: context.userId } });
    await tx.financeEvent.create({ data: {
      id: newId("financeevent"), orgId: context.orgId, orderId: row.orderId, paymentId: row.id,
      type: row.type === "PAYMENT" ? "PAYMENT_RECEIVED" : "REFUND", amount: row.amount, currency: row.currency,
      actorId: context.userId, reference: row.reference, reason: reason ?? null,
      idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:finance` : `confirm:${row.id}`,
    } });
    await appendAudit(tx, context, "payment.confirmed", "Payment", row.id, { orderId: row.orderId, amount: decimalString(row.amount), currency: row.currency });
    await appendErpEvent(tx, context, { aggregateType: "Payment", aggregateId: row.id, type: "payment.confirmed", payload: { orderId: row.orderId, amount: decimalString(row.amount), currency: row.currency } });
  });
  return paymentDto(await getPaymentRow(context, paymentId));
}

export async function voidPayment(context: DomainContext, paymentId: string, reason?: string) {
  requireErpPermission(context, "payment.confirm");
  requireOwnerAiApproval(context, "payment void");
  await serializable(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id"::text FROM "Payment" WHERE "id" = ${paymentId} AND "orgId" = ${context.orgId} FOR UPDATE`);
    const row = await tx.payment.findFirst({ where: { id: paymentId, orgId: context.orgId } });
    if (!row) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (row.status === "VOIDED") return;
    if (row.status !== "PENDING") throw new ApiError(409, "PAYMENT_FINAL", "Confirmed payments must be refunded, not voided");
    await tx.payment.update({ where: { id: row.id }, data: { status: "VOIDED", voidedAt: new Date() } });
    await tx.financeEvent.create({ data: {
      id: newId("financeevent"), orgId: context.orgId, orderId: row.orderId, paymentId: row.id,
      type: "PAYMENT_VOIDED", amount: row.amount, currency: row.currency, actorId: context.userId,
      reference: row.reference, reason: reason ?? null, idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:finance` : `void:${row.id}`,
    } });
    await appendAudit(tx, context, "payment.voided", "Payment", row.id, { reason: reason ?? null });
  });
  return paymentDto(await getPaymentRow(context, paymentId));
}

export async function refundPayment(context: DomainContext, paymentId: string, input: { amount: string; reason: string; reference?: string }) {
  requireErpPermission(context, "payment.refund");
  requireOwnerAiApproval(context, "payment refund");
  const refundId = await serializable(async (tx) => {
    if (context.idempotencyKey) {
      const existing = await tx.payment.findUnique({ where: { orgId_idempotencyKey: { orgId: context.orgId, idempotencyKey: context.idempotencyKey } } });
      if (existing) return existing.id;
    }
    await tx.$queryRaw(Prisma.sql`SELECT "id"::text FROM "Payment" WHERE "id" = ${paymentId} AND "orgId" = ${context.orgId} FOR UPDATE`);
    const original = await tx.payment.findFirst({ where: { id: paymentId, orgId: context.orgId } });
    if (!original) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found");
    if (original.type !== "PAYMENT" || original.status !== "CONFIRMED") throw new ApiError(409, "PAYMENT_NOT_REFUNDABLE", "Only a confirmed payment can be refunded");
    const refunded = await tx.payment.aggregate({
      where: { orgId: context.orgId, parentPaymentId: original.id, type: { in: ["REFUND", "REVERSAL"] }, status: "CONFIRMED" }, _sum: { amount: true },
    });
    const amount = new Prisma.Decimal(input.amount);
    if ((refunded._sum.amount ?? new Prisma.Decimal(0)).plus(amount).gt(original.amount)) {
      throw new ApiError(409, "REFUND_EXCEEDS_PAYMENT", "Refunds cannot exceed the confirmed payment amount");
    }
    const row = await tx.payment.create({ data: {
      id: newId("payment"), orgId: context.orgId, orderId: original.orderId, invoiceId: original.invoiceId,
      parentPaymentId: original.id, amount, currency: original.currency, type: "REFUND", status: "CONFIRMED",
      method: original.method, reference: input.reference ?? original.reference, recordedById: context.userId,
      confirmedById: context.userId, confirmedAt: new Date(), idempotencyKey: context.idempotencyKey ?? null,
    } });
    await tx.financeEvent.create({ data: {
      id: newId("financeevent"), orgId: context.orgId, orderId: row.orderId, paymentId: row.id,
      type: "REFUND", amount, currency: row.currency, actorId: context.userId,
      reference: row.reference, reason: input.reason,
      idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:finance` : `refund:${row.id}`,
    } });
    await appendAudit(tx, context, "payment.refunded", "Payment", row.id, { parentPaymentId: original.id, amount: input.amount, reason: input.reason });
    await appendErpEvent(tx, context, { aggregateType: "Payment", aggregateId: row.id, type: "payment.refunded", payload: { parentPaymentId: original.id, amount: input.amount, currency: row.currency } });
    return row.id;
  });
  return paymentDto(await getPaymentRow(context, refundId));
}

export async function listPayments(context: DomainContext, input: PaymentListInput) {
  requireErpPermission(context, "erp.read");
  const rows = await getDb().payment.findMany({
    where: { orgId: context.orgId, ...(input.orderId ? { orderId: input.orderId } : {}), ...(input.status ? { status: input.status } : {}), ...(input.currency ? { currency: input.currency } : {}) },
    orderBy: [{ paidAt: "desc" }, { id: "desc" }], take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, input.limit);
  return { items: page.map(paymentDto), nextCursor: rows.length > input.limit ? page.at(-1)?.id ?? null : null };
}
