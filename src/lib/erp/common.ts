import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import type { DomainContext } from "./types";

export type Tx = Prisma.TransactionClient;

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  const code = (error.meta as { code?: string } | undefined)?.code;
  return error.code === "P2010" && (code === "40001" || code === "40P01");
}

export async function serializable<T>(
  operation: (tx: Tx) => Promise<T>,
  isolationLevel: Prisma.TransactionIsolationLevel = Prisma.TransactionIsolationLevel.Serializable,
): Promise<T> {
  const db = getDb();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return await db.$transaction(operation, { isolationLevel });
    } catch (error) {
      if (!isRetryable(error)) throw error;
      if (attempt === 11) throw new ApiError(503, "TRANSACTION_RETRY_EXHAUSTED", "The database is temporarily busy");
      const backoffMs = Math.min(300, 10 * (2 ** attempt)) + Math.floor(Math.random() * 25);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw new ApiError(503, "TRANSACTION_RETRY_EXHAUSTED", "The database is temporarily busy");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function decimal(value: string | number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function quantity(value: string | Prisma.Decimal): Prisma.Decimal {
  return decimal(value).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export function money(value: string | Prisma.Decimal): Prisma.Decimal {
  return decimal(value).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export function decimalString(value: Prisma.Decimal): string {
  return value.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP).toFixed(4);
}

export function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

export async function appendAudit(
  tx: Tx,
  context: DomainContext,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      orgId: context.orgId,
      userId: context.userId,
      action,
      entityType,
      entityId,
      metadata: JSON.stringify({
        initiatedBy: context.initiatedBy ?? "user",
        approvalId: context.approvalId ?? null,
        idempotencyKey: context.idempotencyKey ?? null,
        ...(metadata ?? {}),
      }),
    },
  });
}

export async function appendErpEvent(
  tx: Tx,
  context: DomainContext,
  input: { aggregateType: string; aggregateId: string; type: string; payload?: Record<string, unknown> },
): Promise<void> {
  const idempotencyKey = context.idempotencyKey
    ? `${context.idempotencyKey}:${input.type}:${input.aggregateId}`
    : null;
  await tx.eRPEvent.create({
    data: {
      id: newId("erpevt"),
      orgId: context.orgId,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      type: input.type,
      payload: json(input.payload ?? {}),
      actorId: context.userId,
      initiatedBy: context.initiatedBy ?? "user",
      idempotencyKey,
    },
  });
}

export function assertExpectedRevision(current: number, expected: number): void {
  if (current !== expected) {
    throw new ApiError(409, "REVISION_CONFLICT", "Order was changed by another request", { currentRevision: current });
  }
}

export async function lockOrder(tx: Tx, orgId: string, orderId: string): Promise<void> {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"::text FROM "Order"
    WHERE "id" = ${orderId} AND "orgId" = ${orgId}
    FOR UPDATE
  `);
}

export async function advisoryLock(tx: Tx, key: string): Promise<void> {
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`);
}
