import "server-only";

import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { appendAudit, appendErpEvent, decimalString, newId, quantity, serializable, type Tx } from "./common";
import { requireErpPermission, requireOwnerAiApproval } from "./permissions";
import type { InventoryListInput, MovementListInput } from "./schemas";
import type { DomainContext, InventoryBalanceDto, PageResult } from "./types";

type BalanceKey = { warehouseId: string; productId: string };

async function validateStockTarget(tx: Tx, orgId: string, key: BalanceKey) {
  const [warehouse, product] = await Promise.all([
    tx.warehouse.findFirst({ where: { id: key.warehouseId, orgId, active: true, archivedAt: null }, select: { id: true } }),
    tx.product.findFirst({ where: { id: key.productId, orgId, active: true, archivedAt: null }, select: { id: true, type: true } }),
  ]);
  if (!warehouse) throw new ApiError(422, "WAREHOUSE_UNAVAILABLE", "Warehouse is unavailable in this organization");
  if (!product) throw new ApiError(422, "PRODUCT_UNAVAILABLE", "Product is unavailable in this organization");
  if (product.type !== "STOCKED_PRODUCT") throw new ApiError(422, "PRODUCT_NOT_STOCKED", "Only stocked products have inventory balances");
}

async function lockBalances(tx: Tx, orgId: string, keys: BalanceKey[]) {
  const normalized = [...new Map(keys.map((key) => [`${key.warehouseId}:${key.productId}`, key])).values()]
    .sort((a, b) => `${a.warehouseId}:${a.productId}`.localeCompare(`${b.warehouseId}:${b.productId}`));
  for (const key of normalized) {
    await validateStockTarget(tx, orgId, key);
    await tx.inventoryBalance.upsert({
      where: { orgId_warehouseId_productId: { orgId, warehouseId: key.warehouseId, productId: key.productId } },
      update: {},
      create: { id: newId("balance"), orgId, warehouseId: key.warehouseId, productId: key.productId },
    });
  }
  for (const key of normalized) {
    await tx.$queryRaw(Prisma.sql`
      SELECT "id"::text FROM "InventoryBalance"
      WHERE "orgId" = ${orgId} AND "warehouseId" = ${key.warehouseId} AND "productId" = ${key.productId}
      FOR UPDATE
    `);
  }
}

export async function applyBalanceChange(tx: Tx, context: DomainContext, input: {
  warehouseId: string; productId: string; type: string; quantity: Prisma.Decimal;
  onHandDelta?: Prisma.Decimal; reservedDelta?: Prisma.Decimal; sourceType: string; sourceId: string;
  transferId?: string; reason?: string; reference?: string; idempotencyKey?: string;
}) {
  const balance = await tx.inventoryBalance.findUniqueOrThrow({
    where: { orgId_warehouseId_productId: { orgId: context.orgId, warehouseId: input.warehouseId, productId: input.productId } },
  });
  const onHandDelta = input.onHandDelta ?? new Prisma.Decimal(0);
  const reservedDelta = input.reservedDelta ?? new Prisma.Decimal(0);
  const afterOnHand = balance.onHand.plus(onHandDelta);
  const afterReserved = balance.reserved.plus(reservedDelta);
  if (afterOnHand.lt(0) || afterReserved.lt(0) || afterReserved.gt(afterOnHand)) {
    throw new ApiError(409, "INSUFFICIENT_INVENTORY", "Inventory operation would create a negative or over-reserved balance", {
      onHand: decimalString(balance.onHand), reserved: decimalString(balance.reserved),
      requestedOnHandDelta: decimalString(onHandDelta), requestedReservedDelta: decimalString(reservedDelta),
    });
  }
  await tx.inventoryBalance.update({ where: { id: balance.id }, data: {
    onHand: afterOnHand, reserved: afterReserved, revision: { increment: 1 },
  } });
  return tx.inventoryMovement.create({ data: {
    id: newId("movement"), orgId: context.orgId, warehouseId: input.warehouseId, productId: input.productId,
    type: input.type, quantity: input.quantity.abs(), onHandDelta, reservedDelta,
    beforeOnHand: balance.onHand, afterOnHand, beforeReserved: balance.reserved, afterReserved,
    sourceType: input.sourceType, sourceId: input.sourceId, transferId: input.transferId ?? null,
    actorId: context.userId, reason: input.reason ?? null, reference: input.reference ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
  } });
}

export async function reserveInventoryForOrder(
  tx: Tx,
  context: DomainContext,
  order: { id: string; items: Array<{ id: string; productId: string | null; productType: string; quantity: Prisma.Decimal }> },
  warehouseId?: string,
) {
  const stocked = order.items.filter((item) => item.productType === "STOCKED_PRODUCT");
  if (!stocked.length) return;
  if (!warehouseId) throw new ApiError(422, "WAREHOUSE_REQUIRED", "A warehouse is required to confirm an order with stocked products");
  if (stocked.some((item) => !item.productId)) throw new ApiError(409, "STOCKED_PRODUCT_MISSING", "A stocked order item has no canonical product");
  await lockBalances(tx, context.orgId, stocked.map((item) => ({ warehouseId, productId: item.productId! })));
  for (const item of stocked) {
    await applyBalanceChange(tx, context, {
      warehouseId, productId: item.productId!, type: "RESERVATION", quantity: item.quantity,
      reservedDelta: item.quantity, sourceType: "ORDER", sourceId: order.id,
      reason: "Order confirmation", idempotencyKey: `reserve:${order.id}:${item.id}`,
    });
    await tx.inventoryReservation.create({ data: {
      id: newId("reservation"), orgId: context.orgId, orderId: order.id, orderItemId: item.id,
      warehouseId, productId: item.productId!, quantity: item.quantity,
    } });
  }
}

export async function releaseReservationsForOrder(tx: Tx, context: DomainContext, orderId: string, reason: string) {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orgId: context.orgId, orderId, status: { in: ["ACTIVE", "PARTIALLY_CONSUMED"] } },
    orderBy: [{ warehouseId: "asc" }, { productId: "asc" }, { id: "asc" }],
  });
  await lockBalances(tx, context.orgId, reservations.map((row) => ({ warehouseId: row.warehouseId, productId: row.productId })));
  for (const reservation of reservations) {
    const remaining = reservation.quantity.minus(reservation.consumedQuantity).minus(reservation.releasedQuantity);
    if (remaining.lte(0)) continue;
    await applyBalanceChange(tx, context, {
      warehouseId: reservation.warehouseId, productId: reservation.productId, type: "RELEASE", quantity: remaining,
      reservedDelta: remaining.negated(), sourceType: "ORDER", sourceId: orderId, reason,
      idempotencyKey: `release:${orderId}:${reservation.id}`,
    });
    await tx.inventoryReservation.update({ where: { id: reservation.id }, data: {
      releasedQuantity: { increment: remaining }, status: "RELEASED",
    } });
  }
}

export async function receiveInventory(context: DomainContext, input: {
  warehouseId: string; productId: string; quantity: string; reason: string; reference?: string;
}) {
  requireErpPermission(context, "inventory.receive");
  const amount = quantity(input.quantity);
  const movementId = await serializable(async (tx) => {
    if (context.idempotencyKey) {
      const existing = await tx.inventoryMovement.findUnique({ where: { orgId_idempotencyKey: { orgId: context.orgId, idempotencyKey: context.idempotencyKey } } });
      if (existing) return existing.id;
    }
    await lockBalances(tx, context.orgId, [input]);
    const movement = await applyBalanceChange(tx, context, {
      ...input, quantity: amount, type: "RECEIPT", onHandDelta: amount,
      sourceType: "MANUAL_RECEIPT", sourceId: context.idempotencyKey ?? newId("receipt"), idempotencyKey: context.idempotencyKey,
    });
    await appendAudit(tx, context, "inventory.received", "InventoryMovement", movement.id, { ...input });
    await appendErpEvent(tx, context, { aggregateType: "Inventory", aggregateId: input.productId, type: "inventory.received", payload: { warehouseId: input.warehouseId, quantity: input.quantity } });
    return movement.id;
  });
  return getInventoryMovement(context, movementId);
}

export async function adjustInventory(context: DomainContext, input: {
  warehouseId: string; productId: string; delta: string; reason: string; reference?: string;
}) {
  requireErpPermission(context, "inventory.adjust");
  requireOwnerAiApproval(context, "inventory adjustment");
  const delta = quantity(input.delta);
  const movementId = await serializable(async (tx) => {
    if (context.idempotencyKey) {
      const existing = await tx.inventoryMovement.findUnique({ where: { orgId_idempotencyKey: { orgId: context.orgId, idempotencyKey: context.idempotencyKey } } });
      if (existing) return existing.id;
    }
    await lockBalances(tx, context.orgId, [input]);
    const movement = await applyBalanceChange(tx, context, {
      ...input, quantity: delta.abs(), type: "ADJUSTMENT", onHandDelta: delta,
      sourceType: "MANUAL_ADJUSTMENT", sourceId: context.idempotencyKey ?? newId("adjustment"), idempotencyKey: context.idempotencyKey,
    });
    await appendAudit(tx, context, "inventory.adjusted", "InventoryMovement", movement.id, { ...input });
    await appendErpEvent(tx, context, { aggregateType: "Inventory", aggregateId: input.productId, type: "inventory.adjusted", payload: { warehouseId: input.warehouseId, delta: input.delta } });
    return movement.id;
  });
  return getInventoryMovement(context, movementId);
}

export async function transferInventory(context: DomainContext, input: {
  fromWarehouseId: string; toWarehouseId: string; productId: string; quantity: string; reason: string; reference?: string;
}) {
  requireErpPermission(context, "inventory.transfer");
  requireOwnerAiApproval(context, "inventory transfer");
  const amount = quantity(input.quantity);
  const transferId = await serializable(async (tx) => {
    if (context.idempotencyKey) {
      const existing = await tx.inventoryTransfer.findUnique({ where: { orgId_idempotencyKey: { orgId: context.orgId, idempotencyKey: context.idempotencyKey } } });
      if (existing) return existing.id;
    }
    await lockBalances(tx, context.orgId, [
      { warehouseId: input.fromWarehouseId, productId: input.productId },
      { warehouseId: input.toWarehouseId, productId: input.productId },
    ]);
    const transfer = await tx.inventoryTransfer.create({ data: {
      id: newId("transfer"), orgId: context.orgId, productId: input.productId,
      fromWarehouseId: input.fromWarehouseId, toWarehouseId: input.toWarehouseId, quantity: amount,
      actorId: context.userId, reason: input.reason, reference: input.reference ?? null, idempotencyKey: context.idempotencyKey,
    } });
    await applyBalanceChange(tx, context, {
      warehouseId: input.fromWarehouseId, productId: input.productId, type: "TRANSFER_OUT", quantity: amount,
      onHandDelta: amount.negated(), sourceType: "TRANSFER", sourceId: transfer.id, transferId: transfer.id,
      reason: input.reason, reference: input.reference, idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:out` : undefined,
    });
    await applyBalanceChange(tx, context, {
      warehouseId: input.toWarehouseId, productId: input.productId, type: "TRANSFER_IN", quantity: amount,
      onHandDelta: amount, sourceType: "TRANSFER", sourceId: transfer.id, transferId: transfer.id,
      reason: input.reason, reference: input.reference, idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:in` : undefined,
    });
    await appendAudit(tx, context, "inventory.transferred", "InventoryTransfer", transfer.id, { ...input });
    await appendErpEvent(tx, context, { aggregateType: "InventoryTransfer", aggregateId: transfer.id, type: "inventory.transferred", payload: input });
    return transfer.id;
  });
  const row = await getDb().inventoryTransfer.findFirst({ where: { id: transferId, orgId: context.orgId } });
  if (!row) throw new ApiError(404, "TRANSFER_NOT_FOUND", "Inventory transfer not found");
  return { ...row, quantity: decimalString(row.quantity), createdAt: row.createdAt.toISOString() };
}

function balanceDto(row: Prisma.InventoryBalanceGetPayload<{ include: { warehouse: true; product: true } }>): InventoryBalanceDto {
  const available = row.onHand.minus(row.reserved);
  const threshold = row.product.lowStockThreshold;
  return {
    id: row.id, warehouseId: row.warehouseId, warehouseCode: row.warehouse.code, warehouseName: row.warehouse.name,
    productId: row.productId, sku: row.product.sku, productName: row.product.name, unit: row.product.unit,
    onHand: decimalString(row.onHand), reserved: decimalString(row.reserved), available: decimalString(available),
    lowStockThreshold: threshold ? decimalString(threshold) : null,
    lowStock: threshold !== null && available.lte(threshold), revision: row.revision, updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listInventory(context: DomainContext, input: InventoryListInput): Promise<PageResult<InventoryBalanceDto>> {
  requireErpPermission(context, "erp.read");
  const rows = await getDb().inventoryBalance.findMany({
    where: {
      orgId: context.orgId,
      ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
      ...(input.productId ? { productId: input.productId } : {}),
      ...(input.q ? { product: { OR: [{ sku: { contains: input.q, mode: "insensitive" } }, { name: { contains: input.q, mode: "insensitive" } }] } } : {}),
    },
    include: { warehouse: true, product: true }, orderBy: { id: "asc" }, take: 101,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const filtered = rows.map(balanceDto).filter((row) => input.availability === "all"
    || (input.availability === "available" && new Prisma.Decimal(row.available).gt(0))
    || (input.availability === "out" && new Prisma.Decimal(row.available).eq(0))
    || (input.availability === "low" && row.lowStock));
  const page = filtered.slice(0, input.limit);
  return { items: page, nextCursor: filtered.length > input.limit ? page.at(-1)?.id ?? null : null };
}

export async function listMovements(context: DomainContext, input: MovementListInput) {
  requireErpPermission(context, "erp.read");
  const rows = await getDb().inventoryMovement.findMany({
    where: { orgId: context.orgId, ...(input.warehouseId ? { warehouseId: input.warehouseId } : {}), ...(input.productId ? { productId: input.productId } : {}) },
    include: { warehouse: { select: { code: true } }, product: { select: { sku: true, name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, input.limit);
  return { items: page.map((row) => ({
    ...row, quantity: decimalString(row.quantity), onHandDelta: decimalString(row.onHandDelta), reservedDelta: decimalString(row.reservedDelta),
    beforeOnHand: decimalString(row.beforeOnHand), afterOnHand: decimalString(row.afterOnHand),
    beforeReserved: decimalString(row.beforeReserved), afterReserved: decimalString(row.afterReserved), createdAt: row.createdAt.toISOString(),
  })), nextCursor: rows.length > input.limit ? page.at(-1)?.id ?? null : null };
}

export async function getInventoryMovement(context: DomainContext, movementId: string) {
  requireErpPermission(context, "erp.read");
  const row = await getDb().inventoryMovement.findFirst({ where: { id: movementId, orgId: context.orgId } });
  if (!row) throw new ApiError(404, "MOVEMENT_NOT_FOUND", "Inventory movement not found");
  return {
    ...row, quantity: decimalString(row.quantity), onHandDelta: decimalString(row.onHandDelta), reservedDelta: decimalString(row.reservedDelta),
    beforeOnHand: decimalString(row.beforeOnHand), afterOnHand: decimalString(row.afterOnHand),
    beforeReserved: decimalString(row.beforeReserved), afterReserved: decimalString(row.afterReserved), createdAt: row.createdAt.toISOString(),
  };
}

export { lockBalances };
