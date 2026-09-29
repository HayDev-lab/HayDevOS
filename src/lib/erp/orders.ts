import "server-only";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import {
  advisoryLock,
  appendAudit,
  appendErpEvent,
  assertExpectedRevision,
  decimalString,
  json,
  lockOrder,
  newId,
  serializable,
  type Tx,
} from "./common";
import { releaseReservationsForOrder, reserveInventoryForOrder } from "./inventory";
import { requireErpPermission, requireOwnerAiApproval } from "./permissions";
import type { OrderListInput } from "./schemas";
import type { DomainContext, OrderDto, OrderPaymentStatus, PageResult, ProductType } from "./types";

const customerSnapshotSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
}).passthrough();

const itemSnapshotSchema = z.object({
  productId: z.string().nullable().optional(),
  productName: z.string().min(1),
  description: z.string().nullable().optional(),
  unit: z.string().min(1),
  quantity: z.string(),
  unitPrice: z.string(),
  discount: z.string(),
  quoteDiscountShare: z.string().default("0"),
  tax: z.string(),
  total: z.string(),
  position: z.number().int().nonnegative(),
}).passthrough();

const itemsSnapshotSchema = z.array(itemSnapshotSchema).min(1).max(500);

const orderInclude = {
  items: { orderBy: [{ position: "asc" as const }, { id: "asc" as const }] },
  payments: { where: { status: "CONFIRMED" }, select: { type: true, amount: true, currency: true } },
  _count: { select: { fulfillments: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function paymentSummary(row: OrderRow) {
  let received = new Prisma.Decimal(0);
  let refunded = new Prisma.Decimal(0);
  const unmatched = new Map<string, Prisma.Decimal>();
  for (const payment of row.payments) {
    const sign = payment.type === "PAYMENT" ? 1 : -1;
    if (payment.currency === row.currency) {
      if (sign === 1) received = received.plus(payment.amount);
      else refunded = refunded.plus(payment.amount);
    } else {
      unmatched.set(payment.currency, (unmatched.get(payment.currency) ?? new Prisma.Decimal(0)).plus(payment.amount.mul(sign)));
    }
  }
  const net = received.minus(refunded);
  const outstanding = Prisma.Decimal.max(row.total.minus(net), 0);
  let status: OrderPaymentStatus = "UNPAID";
  if (net.gt(0) && net.lt(row.total)) status = "PARTIALLY_PAID";
  else if (net.eq(row.total) && row.total.gt(0)) status = "PAID";
  else if (net.gt(row.total)) status = "OVERPAID";
  return {
    status,
    received: decimalString(received),
    refunded: decimalString(refunded),
    netReceived: decimalString(net),
    outstanding: decimalString(outstanding),
    unmatchedCurrencies: [...unmatched.entries()].filter(([, amount]) => !amount.eq(0)).map(([currency, amount]) => ({
      currency,
      amount: decimalString(amount),
    })),
  };
}

function toDto(row: OrderRow, documentCount = 0): OrderDto {
  return {
    id: row.id,
    number: row.number,
    customerId: row.customerId,
    customerSnapshot: row.customerSnapshot as Record<string, unknown>,
    sourceQuoteId: row.sourceQuoteId,
    sourceQuoteVersionId: row.sourceQuoteVersionId,
    status: row.status as OrderDto["status"],
    currency: row.currency,
    subtotal: decimalString(row.subtotal),
    discountTotal: decimalString(row.discountTotal),
    taxTotal: decimalString(row.taxTotal),
    total: decimalString(row.total),
    revision: row.revision,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productType: item.productType as ProductType,
      sku: item.sku,
      name: item.name,
      description: item.description,
      unit: item.unit,
      quantity: decimalString(item.quantity),
      unitPrice: decimalString(item.unitPrice),
      discount: decimalString(item.discount),
      tax: decimalString(item.tax),
      lineTotal: decimalString(item.lineTotal),
      currency: item.currency,
      position: item.position,
    })),
    payments: paymentSummary(row),
    fulfillmentCount: row._count.fulfillments,
    documentCount,
  };
}

async function allocateOrderNumber(
  db: Tx | ReturnType<typeof getDb>,
  orgId: string,
  year: number,
): Promise<string> {
  const rows = await db.$queryRaw<Array<{ allocated: number }>>(Prisma.sql`
    INSERT INTO "OrderNumberCounter" ("orgId", "year", "nextValue", "updatedAt")
    VALUES (${orgId}, ${year}, 2, NOW())
    ON CONFLICT ("orgId", "year") DO UPDATE
      SET "nextValue" = "OrderNumberCounter"."nextValue" + 1, "updatedAt" = NOW()
    RETURNING "nextValue" - 1 AS allocated
  `);
  const allocated = Number(rows[0]?.allocated);
  if (!Number.isSafeInteger(allocated) || allocated < 1) {
    throw new ApiError(500, "ORDER_NUMBER_FAILED", "Could not allocate an order number");
  }
  return `ORD-${year}-${String(allocated).padStart(6, "0")}`;
}

async function loadOrder(tx: Tx, context: DomainContext, orderId: string): Promise<OrderRow> {
  const order = await tx.order.findFirst({ where: { id: orderId, orgId: context.orgId }, include: orderInclude });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
  return order;
}

export async function getOrder(context: DomainContext, orderId: string): Promise<OrderDto> {
  requireErpPermission(context, "erp.read");
  const row = await getDb().order.findFirst({ where: { id: orderId, orgId: context.orgId }, include: orderInclude });
  if (!row) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
  const documentCount = await getDb().documentRecord.count({
    where: { orgId: context.orgId, sourceType: "ORDER", sourceId: orderId, archivedAt: null },
  });
  return toDto(row, documentCount);
}

export async function listOrders(context: DomainContext, input: OrderListInput): Promise<PageResult<OrderDto>> {
  requireErpPermission(context, "erp.read");
  const orderBy = input.sort === "number" ? { number: input.direction }
    : input.sort === "status" ? { status: input.direction }
      : input.sort === "total" ? { total: input.direction }
        : { createdAt: input.direction };
  const rows = await getDb().order.findMany({
    where: {
      orgId: context.orgId,
      archivedAt: null,
      ...(input.status ? { status: input.status } : {}),
      ...(input.customerId ? { customerId: input.customerId } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.q ? { OR: [
        { number: { contains: input.q, mode: "insensitive" } },
        { customer: { name: { contains: input.q, mode: "insensitive" } } },
      ] } : {}),
    },
    include: orderInclude,
    orderBy: [orderBy, { id: input.direction }],
    take: input.paymentStatus ? 101 : input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const filtered = input.paymentStatus ? rows.filter((row) => paymentSummary(row).status === input.paymentStatus) : rows;
  const page = filtered.slice(0, input.limit);
  return { items: page.map((row) => toDto(row)), nextCursor: filtered.length > input.limit ? page.at(-1)?.id ?? null : null };
}

export async function createOrderFromAcceptedQuote(context: DomainContext, quoteId: string): Promise<OrderDto> {
  requireErpPermission(context, "order.create");
  const db = getDb();
  const source = await db.quote.findFirst({
    where: { id: quoteId, orgId: context.orgId },
    select: { status: true, acceptedVersionId: true },
  });
  if (!source) throw new ApiError(404, "QUOTE_NOT_FOUND", "Quote not found");
  if (source.status !== "accepted" || !source.acceptedVersionId) {
    throw new ApiError(409, "QUOTE_NOT_ACCEPTED", "Only an accepted immutable quote version can create an order");
  }
  const existingOrder = await db.order.findUnique({
    where: { sourceQuoteVersionId: source.acceptedVersionId },
    select: { id: true, orgId: true },
  });
  if (existingOrder) {
    if (existingOrder.orgId !== context.orgId) {
      throw new ApiError(409, "ORDER_SOURCE_CONFLICT", "Accepted quote version is already bound");
    }
    return getOrder(context, existingOrder.id);
  }
  // Keep the tenant counter lock out of the longer order snapshot transaction.
  // A concurrent idempotent replay may consume a number, but numbers are never
  // reused and the source-version uniqueness constraint still permits one order.
  const allocatedNumber = await allocateOrderNumber(db, context.orgId, new Date().getUTCFullYear());
  const orderId = await serializable(async (tx) => {
    await advisoryLock(tx, `accepted-quote-order:${context.orgId}:${quoteId}`);
    const quote = await tx.quote.findFirst({
      where: { id: quoteId, orgId: context.orgId },
      select: { id: true, status: true, acceptedVersionId: true, customerId: true, leadId: true },
    });
    if (!quote) throw new ApiError(404, "QUOTE_NOT_FOUND", "Quote not found");
    if (quote.status !== "accepted" || !quote.acceptedVersionId) {
      throw new ApiError(409, "QUOTE_NOT_ACCEPTED", "Only an accepted immutable quote version can create an order");
    }
    const existing = await tx.order.findUnique({ where: { sourceQuoteVersionId: quote.acceptedVersionId }, select: { id: true, orgId: true } });
    if (existing) {
      if (existing.orgId !== context.orgId) throw new ApiError(409, "ORDER_SOURCE_CONFLICT", "Accepted quote version is already bound");
      return existing.id;
    }
    const version = await tx.quoteVersion.findFirst({
      where: { id: quote.acceptedVersionId, quoteId, orgId: context.orgId },
    });
    if (!version) throw new ApiError(409, "ACCEPTED_VERSION_MISSING", "Accepted quote version is unavailable");
    const customerSnapshot = customerSnapshotSchema.parse(version.customerSnapshot);
    const itemSnapshots = itemsSnapshotSchema.parse(version.itemsSnapshot);

    let customerId = quote.customerId;
    if (customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, orgId: context.orgId }, select: { id: true } });
      if (!customer) customerId = null;
    }
    if (!customerId && quote.leadId) {
      customerId = (await tx.customer.findUnique({
        where: { orgId_sourceLeadId: { orgId: context.orgId, sourceLeadId: quote.leadId } }, select: { id: true },
      }))?.id ?? null;
    }
    if (!customerId) {
      const customer = await tx.customer.create({ data: {
        id: newId("customer"),
        orgId: context.orgId,
        sourceLeadId: quote.leadId,
        name: customerSnapshot.name,
        email: customerSnapshot.email ?? null,
        address: customerSnapshot.address ?? null,
        taxId: customerSnapshot.taxId ?? null,
        type: "business",
        createdById: context.userId,
      } });
      customerId = customer.id;
    }

    const productIds = itemSnapshots.flatMap((item) => item.productId ? [item.productId] : []);
    const products = await tx.product.findMany({
      where: { orgId: context.orgId, id: { in: productIds } },
      select: { id: true, sku: true, type: true },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const id = newId("order");
    await tx.order.create({ data: {
      id,
      orgId: context.orgId,
      number: allocatedNumber,
      customerId,
      sourceQuoteId: quoteId,
      sourceQuoteVersionId: version.id,
      currency: version.currency,
      subtotal: version.subtotal,
      discountTotal: version.lineDiscount.plus(version.quoteDiscount),
      taxTotal: version.tax,
      total: version.total,
      customerSnapshot: json(customerSnapshot),
      createdById: context.userId,
      items: { create: itemSnapshots.map((item) => {
        const product = item.productId ? productMap.get(item.productId) : undefined;
        return {
          id: newId("orderitem"),
          productId: product?.id ?? null,
          productType: product?.type ?? "NON_STOCKED_PRODUCT",
          sku: product?.sku ?? null,
          name: item.productName,
          description: item.description ?? null,
          unit: item.unit,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          discount: new Prisma.Decimal(item.discount).plus(item.quoteDiscountShare),
          tax: new Prisma.Decimal(item.tax),
          lineTotal: new Prisma.Decimal(item.total),
          currency: version.currency,
          position: item.position,
        };
      }) },
      statusEvents: { create: {
        id: newId("orderstatus"), toStatus: "DRAFT", actorId: context.userId,
        initiatedBy: context.initiatedBy ?? "user", reason: "Created from accepted quote version",
      } },
    } });
    await appendAudit(tx, context, "order.created_from_quote", "Order", id, { quoteId, quoteVersionId: version.id, number: allocatedNumber });
    await appendErpEvent(tx, context, { aggregateType: "Order", aggregateId: id, type: "order.created", payload: { quoteId, quoteVersionId: version.id, number: allocatedNumber } });
    return id;
  }, Prisma.TransactionIsolationLevel.ReadCommitted);
  return getOrder(context, orderId);
}

async function transitionOrder(
  context: DomainContext,
  orderId: string,
  input: { expectedRevision: number; to: "CANCELLED" | "COMPLETED"; allowed: string[]; reason?: string },
): Promise<OrderDto> {
  await serializable(async (tx) => {
    await lockOrder(tx, context.orgId, orderId);
    const order = await loadOrder(tx, context, orderId);
    assertExpectedRevision(order.revision, input.expectedRevision);
    if (!input.allowed.includes(order.status)) throw new ApiError(409, "INVALID_ORDER_TRANSITION", `Cannot change order from ${order.status} to ${input.to}`);
    if (input.to === "CANCELLED") await releaseReservationsForOrder(tx, context, orderId, input.reason ?? "Order cancelled");
    const now = new Date();
    await tx.order.update({ where: { id: orderId }, data: {
      status: input.to,
      revision: { increment: 1 },
      ...(input.to === "CANCELLED" ? { cancelledAt: now } : { completedAt: now }),
    } });
    await tx.orderStatusEvent.create({ data: {
      id: newId("orderstatus"), orgId: context.orgId, orderId, fromStatus: order.status, toStatus: input.to,
      actorId: context.userId, initiatedBy: context.initiatedBy ?? "user", reason: input.reason ?? null,
    } });
    await appendAudit(tx, context, `order.${input.to.toLowerCase()}`, "Order", orderId, { from: order.status, to: input.to });
    await appendErpEvent(tx, context, { aggregateType: "Order", aggregateId: orderId, type: `order.${input.to.toLowerCase()}` });
  });
  return getOrder(context, orderId);
}

export async function confirmOrder(context: DomainContext, orderId: string, expectedRevision: number, warehouseId?: string): Promise<OrderDto> {
  requireErpPermission(context, "order.confirm");
  requireOwnerAiApproval(context, "order confirmation");
  await serializable(async (tx) => {
    await lockOrder(tx, context.orgId, orderId);
    const order = await loadOrder(tx, context, orderId);
    assertExpectedRevision(order.revision, expectedRevision);
    if (order.status !== "DRAFT") throw new ApiError(409, "INVALID_ORDER_TRANSITION", "Only a draft order can be confirmed");
    await reserveInventoryForOrder(tx, context, order, warehouseId);
    const now = new Date();
    await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED", confirmedAt: now, revision: { increment: 1 } } });
    await tx.orderStatusEvent.create({ data: {
      id: newId("orderstatus"), orgId: context.orgId, orderId, fromStatus: "DRAFT", toStatus: "CONFIRMED",
      actorId: context.userId, initiatedBy: context.initiatedBy ?? "user", reason: "Inventory reserved and order confirmed",
    } });
    await appendAudit(tx, context, "order.confirmed", "Order", orderId, { warehouseId: warehouseId ?? null });
    await appendErpEvent(tx, context, { aggregateType: "Order", aggregateId: orderId, type: "order.confirmed", payload: { warehouseId: warehouseId ?? null } });
  });
  return getOrder(context, orderId);
}

export async function cancelOrder(context: DomainContext, orderId: string, expectedRevision: number, reason?: string): Promise<OrderDto> {
  requireErpPermission(context, "order.cancel");
  requireOwnerAiApproval(context, "order cancellation");
  return transitionOrder(context, orderId, { expectedRevision, to: "CANCELLED", allowed: ["DRAFT", "CONFIRMED", "PROCESSING"], reason });
}

export async function completeOrder(context: DomainContext, orderId: string, expectedRevision: number, reason?: string): Promise<OrderDto> {
  requireErpPermission(context, "order.complete");
  return transitionOrder(context, orderId, { expectedRevision, to: "COMPLETED", allowed: ["FULFILLED"], reason });
}
