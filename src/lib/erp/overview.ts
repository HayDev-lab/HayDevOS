import "server-only";

import { Prisma } from "@prisma/client";

import { getDb } from "@/lib/db";
import { decimalString } from "./common";
import { requireErpPermission } from "./permissions";
import type { DomainContext } from "./types";

export async function getErpOverview(context: DomainContext) {
  requireErpPermission(context, "erp.read");
  const db = getDb();
  const [statusGroups, orderCurrencyGroups, paymentGroups, balances, recentOrders] = await Promise.all([
    db.order.groupBy({ by: ["status"], where: { orgId: context.orgId, archivedAt: null }, _count: { _all: true } }),
    db.order.groupBy({ by: ["currency"], where: { orgId: context.orgId, archivedAt: null, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: { _all: true } }),
    db.payment.groupBy({ by: ["currency", "type"], where: { orgId: context.orgId, status: "CONFIRMED" }, _sum: { amount: true }, _count: { _all: true } }),
    db.inventoryBalance.findMany({ where: { orgId: context.orgId }, include: { product: { select: { lowStockThreshold: true } } } }),
    db.order.findMany({ where: { orgId: context.orgId, archivedAt: null }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, number: true, status: true, currency: true, total: true, revision: true, createdAt: true } }),
  ]);
  const paymentByCurrency = new Map<string, { received: Prisma.Decimal; refunded: Prisma.Decimal }>();
  for (const row of paymentGroups) {
    const group = paymentByCurrency.get(row.currency) ?? { received: new Prisma.Decimal(0), refunded: new Prisma.Decimal(0) };
    if (row.type === "PAYMENT") group.received = group.received.plus(row._sum.amount ?? 0);
    else group.refunded = group.refunded.plus(row._sum.amount ?? 0);
    paymentByCurrency.set(row.currency, group);
  }
  return {
    orderStatus: Object.fromEntries(statusGroups.map((row) => [row.status, row._count._all])),
    ordersByCurrency: orderCurrencyGroups.map((row) => ({ currency: row.currency, count: row._count._all, total: decimalString(row._sum.total ?? new Prisma.Decimal(0)) })),
    paymentsByCurrency: [...paymentByCurrency.entries()].map(([currency, value]) => ({
      currency, received: decimalString(value.received), refunded: decimalString(value.refunded), net: decimalString(value.received.minus(value.refunded)),
    })),
    inventory: {
      balanceCount: balances.length,
      outOfStock: balances.filter((row) => row.onHand.minus(row.reserved).eq(0)).length,
      lowStock: balances.filter((row) => row.product.lowStockThreshold !== null && row.onHand.minus(row.reserved).lte(row.product.lowStockThreshold!)).length,
      reservedLines: balances.filter((row) => row.reserved.gt(0)).length,
    },
    recentOrders: recentOrders.map((row) => ({ ...row, total: decimalString(row.total), createdAt: row.createdAt.toISOString() })),
    note: "Amounts are grouped by currency; no implicit FX conversion is performed.",
  };
}
