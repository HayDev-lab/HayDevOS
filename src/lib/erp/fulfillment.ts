import "server-only";

import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import {
  appendAudit,
  appendErpEvent,
  assertExpectedRevision,
  decimalString,
  lockOrder,
  newId,
  quantity,
  serializable,
} from "./common";
import { applyBalanceChange, lockBalances } from "./inventory";
import { requireErpPermission, requireOwnerAiApproval } from "./permissions";
import type { FulfillmentInput } from "./schemas";
import type { DomainContext } from "./types";

export async function createFulfillment(context: DomainContext, orderId: string, input: FulfillmentInput) {
  requireErpPermission(context, "fulfillment.create");
  requireOwnerAiApproval(context, "order fulfillment");
  const fulfillmentId = await serializable(async (tx) => {
    if (context.idempotencyKey) {
      const existing = await tx.fulfillment.findUnique({
        where: { orgId_idempotencyKey: { orgId: context.orgId, idempotencyKey: context.idempotencyKey } },
        select: { id: true, orderId: true },
      });
      if (existing) {
        if (existing.orderId !== orderId) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key belongs to another order");
        return existing.id;
      }
    }
    await lockOrder(tx, context.orgId, orderId);
    const order = await tx.order.findFirst({
      where: { id: orderId, orgId: context.orgId },
      include: {
        items: true,
        fulfillments: { select: { id: true } },
        reservations: true,
      },
    });
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
    assertExpectedRevision(order.revision, input.expectedRevision);
    if (!["CONFIRMED", "PROCESSING", "PARTIALLY_FULFILLED"].includes(order.status)) {
      throw new ApiError(409, "INVALID_ORDER_TRANSITION", `Order ${order.status} cannot be fulfilled`);
    }
    const requested = new Map(input.items.map((item) => [item.orderItemId, quantity(item.quantity)]));
    const selected = order.items.filter((item) => requested.has(item.id));
    if (selected.length !== requested.size) throw new ApiError(422, "INVALID_ORDER_ITEM", "One or more fulfillment items do not belong to this order");
    const already = await tx.fulfillmentItem.groupBy({
      by: ["orderItemId"], where: { orgId: context.orgId, orderId }, _sum: { quantity: true },
    });
    const fulfilledByItem = new Map(already.map((row) => [row.orderItemId, row._sum.quantity ?? new Prisma.Decimal(0)]));
    for (const item of selected) {
      const next = (fulfilledByItem.get(item.id) ?? new Prisma.Decimal(0)).plus(requested.get(item.id)!);
      if (next.gt(item.quantity)) throw new ApiError(409, "OVER_FULFILLMENT", `Fulfillment exceeds ordered quantity for ${item.name}`);
    }

    const reservationByItem = new Map(order.reservations.map((row) => [row.orderItemId, row]));
    const stockItems = selected.filter((item) => item.productType === "STOCKED_PRODUCT");
    for (const item of stockItems) {
      const reservation = reservationByItem.get(item.id);
      if (!reservation || !item.productId) throw new ApiError(409, "RESERVATION_MISSING", `Stock reservation is missing for ${item.name}`);
      const remaining = reservation.quantity.minus(reservation.consumedQuantity).minus(reservation.releasedQuantity);
      if (requested.get(item.id)!.gt(remaining)) throw new ApiError(409, "RESERVATION_EXCEEDED", `Reserved quantity is insufficient for ${item.name}`);
    }
    await lockBalances(tx, context.orgId, stockItems.map((item) => {
      const reservation = reservationByItem.get(item.id)!;
      return { warehouseId: reservation.warehouseId, productId: item.productId! };
    }));

    const id = newId("fulfillment");
    const number = `FUL-${String(order.fulfillments.length + 1).padStart(4, "0")}`;
    await tx.fulfillment.create({ data: {
      id, orgId: context.orgId, orderId, number, actorId: context.userId,
      note: input.note ?? null, idempotencyKey: context.idempotencyKey ?? null,
    } });
    for (const item of selected) {
      const amount = requested.get(item.id)!;
      const reservation = reservationByItem.get(item.id);
      if (item.productType === "STOCKED_PRODUCT" && reservation && item.productId) {
        await applyBalanceChange(tx, context, {
          warehouseId: reservation.warehouseId, productId: item.productId, type: "ISSUE", quantity: amount,
          onHandDelta: amount.negated(), reservedDelta: amount.negated(), sourceType: "FULFILLMENT", sourceId: id,
          reason: `Fulfillment ${number}`,
          idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:${item.id}` : undefined,
        });
        const consumed = reservation.consumedQuantity.plus(amount);
        const remaining = reservation.quantity.minus(consumed).minus(reservation.releasedQuantity);
        await tx.inventoryReservation.update({ where: { id: reservation.id }, data: {
          consumedQuantity: consumed,
          status: remaining.eq(0) ? "CONSUMED" : "PARTIALLY_CONSUMED",
        } });
      }
      await tx.fulfillmentItem.create({ data: {
        id: newId("fulfillmentitem"), orgId: context.orgId, fulfillmentId: id, orderId, orderItemId: item.id,
        productId: item.productId, warehouseId: reservation?.warehouseId ?? null, quantity: amount,
      } });
      fulfilledByItem.set(item.id, (fulfilledByItem.get(item.id) ?? new Prisma.Decimal(0)).plus(amount));
    }
    const fullyFulfilled = order.items.every((item) => (fulfilledByItem.get(item.id) ?? new Prisma.Decimal(0)).eq(item.quantity));
    const toStatus = fullyFulfilled ? "FULFILLED" : "PARTIALLY_FULFILLED";
    const now = new Date();
    await tx.order.update({ where: { id: order.id }, data: {
      status: toStatus, revision: { increment: 1 }, ...(fullyFulfilled ? { fulfilledAt: now } : {}),
    } });
    await tx.orderStatusEvent.create({ data: {
      id: newId("orderstatus"), orgId: context.orgId, orderId, fromStatus: order.status, toStatus,
      actorId: context.userId, initiatedBy: context.initiatedBy ?? "user", reason: `Fulfillment ${number}`,
    } });
    await appendAudit(tx, context, "fulfillment.created", "Fulfillment", id, { orderId, number, status: toStatus });
    await appendErpEvent(tx, context, { aggregateType: "Order", aggregateId: orderId, type: "order.fulfilled", payload: { fulfillmentId: id, number, status: toStatus } });
    return id;
  });
  return getFulfillment(context, fulfillmentId);
}

export async function getFulfillment(context: DomainContext, fulfillmentId: string) {
  requireErpPermission(context, "erp.read");
  const row = await getDb().fulfillment.findFirst({
    where: { id: fulfillmentId, orgId: context.orgId }, include: { items: { orderBy: { id: "asc" } } },
  });
  if (!row) throw new ApiError(404, "FULFILLMENT_NOT_FOUND", "Fulfillment not found");
  return {
    ...row,
    completedAt: row.completedAt.toISOString(), createdAt: row.createdAt.toISOString(),
    items: row.items.map((item) => ({ ...item, quantity: decimalString(item.quantity), createdAt: item.createdAt.toISOString() })),
  };
}

export async function listFulfillments(context: DomainContext, orderId: string) {
  requireErpPermission(context, "erp.read");
  const order = await getDb().order.findFirst({ where: { id: orderId, orgId: context.orgId }, select: { id: true } });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
  const rows = await getDb().fulfillment.findMany({ where: { orderId, orgId: context.orgId }, orderBy: { createdAt: "desc" }, include: { items: true } });
  return rows.map((row) => ({ ...row, completedAt: row.completedAt.toISOString(), createdAt: row.createdAt.toISOString(), items: row.items.map((item) => ({ ...item, quantity: decimalString(item.quantity), createdAt: item.createdAt.toISOString() })) }));
}
