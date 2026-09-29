#!/usr/bin/env node
import { Prisma, PrismaClient } from "@prisma/client";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url || !/^postgres(?:ql)?:\/\//i.test(url)) throw new Error("DIRECT_URL or DATABASE_URL must be PostgreSQL.");
const db = new PrismaClient({ datasources: { db: { url } } });
let errors = 0;
try {
  const balances = await db.inventoryBalance.findMany({ orderBy: [{ orgId: "asc" }, { warehouseId: "asc" }, { productId: "asc" }] });
  for (const balance of balances) {
    const movements = await db.inventoryMovement.findMany({ where: { orgId: balance.orgId, warehouseId: balance.warehouseId, productId: balance.productId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    let onHand = new Prisma.Decimal(0); let reserved = new Prisma.Decimal(0);
    for (const movement of movements) {
      if (!movement.beforeOnHand.eq(onHand) || !movement.beforeReserved.eq(reserved)) { console.error(`BROKEN_CHAIN ${movement.id}`); errors++; }
      onHand = onHand.plus(movement.onHandDelta); reserved = reserved.plus(movement.reservedDelta);
      if (!movement.afterOnHand.eq(onHand) || !movement.afterReserved.eq(reserved)) { console.error(`INVALID_AFTER ${movement.id}`); errors++; }
    }
    const reservations = await db.inventoryReservation.findMany({ where: { orgId: balance.orgId, warehouseId: balance.warehouseId, productId: balance.productId } });
    const openReserved = reservations.reduce((sum, row) => sum.plus(row.quantity).minus(row.consumedQuantity).minus(row.releasedQuantity), new Prisma.Decimal(0));
    if (!balance.onHand.eq(onHand) || !balance.reserved.eq(reserved) || !balance.reserved.eq(openReserved)) {
      console.error(`BALANCE_MISMATCH ${balance.id} stored=${balance.onHand}/${balance.reserved} ledger=${onHand}/${reserved} reservations=${openReserved}`); errors++;
    }
  }
  const transfers = await db.inventoryTransfer.findMany({ select: { id: true, orgId: true, quantity: true } });
  for (const transfer of transfers) {
    const moves = await db.inventoryMovement.findMany({ where: { orgId: transfer.orgId, transferId: transfer.id } });
    const delta = moves.reduce((sum, row) => sum.plus(row.onHandDelta), new Prisma.Decimal(0));
    if (moves.length !== 2 || !delta.eq(0)) { console.error(`TRANSFER_MISMATCH ${transfer.id}`); errors++; }
  }
  console.log(JSON.stringify({ balances: balances.length, transfers: transfers.length, errors, readOnly: true }));
  if (errors) process.exitCode = 1;
} finally { await db.$disconnect(); }
