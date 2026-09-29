import "server-only";

import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { generateQuoteArtifact } from "@/lib/documents/service";
import { archiveProduct as archiveErpProduct, createProduct as createErpProduct, updateProduct as updateErpProduct } from "@/lib/erp/catalog";
import type { DocumentFormat, DocumentLocale } from "@/lib/documents/types";
import { canQuote, requireQuotePermission } from "./permissions";
import { calculateAuthoritativePrice, type PricingLineInput } from "./pricing";
import type {
  CreateQuoteInput,
  ProductInput,
  ProductUpdateInput,
  QuoteListQuery,
  UpdateQuoteInput,
  UpdateQuoteSettingsInput,
} from "./schemas";
import type { DomainContext, QuoteCurrency, QuoteDto, QuoteStatus } from "./types";

type Tx = Prisma.TransactionClient;

function isRetryableTransactionError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return error.code === "P2034" || (error.code === "P2010" && (error.meta as { code?: string } | undefined)?.code === "40001");
}

async function transactionWithRetry<T>(
  db: ReturnType<typeof getDb>,
  operation: (tx: Tx) => Promise<T>,
  isolationLevel: Prisma.TransactionIsolationLevel = Prisma.TransactionIsolationLevel.Serializable,
): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await db.$transaction(operation, { isolationLevel });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === 7) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5 * (attempt + 1)));
    }
  }
  throw new ApiError(503, "TRANSACTION_RETRY_EXHAUSTED", "The database is temporarily busy");
}

const quoteInclude = {
  items: { orderBy: [{ position: "asc" as const }, { id: "asc" as const }] },
} satisfies Prisma.QuoteInclude;

type QuoteRow = Prisma.QuoteGetPayload<{ include: typeof quoteInclude }>;

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function clean(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}

function iso(value: Date | null): string | null { return value?.toISOString() ?? null; }

function toDto(row: QuoteRow): QuoteDto {
  return {
    id: row.id,
    number: row.number,
    leadId: row.leadId,
    customerId: row.customerId,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerAddress: row.customerAddress,
    customerTaxId: row.customerTaxId,
    ownerId: row.ownerId,
    status: row.status as QuoteStatus,
    currency: row.currency as QuoteCurrency,
    subtotal: row.subtotal.toFixed(2),
    lineDiscount: row.lineDiscount.toFixed(2),
    quoteDiscount: row.quoteDiscount.toFixed(2),
    discount: row.discount.toFixed(2),
    tax: row.tax.toFixed(2),
    total: row.total.toFixed(2),
    quoteDiscountType: row.quoteDiscountType as "percent" | "fixed",
    quoteDiscountValue: row.quoteDiscountValue.toFixed(4),
    taxRate: row.taxRate.toFixed(4),
    taxIncluded: row.taxIncluded,
    validUntil: iso(row.validUntil),
    terms: row.terms,
    notes: row.notes,
    revision: row.revision,
    currentVersionNumber: row.currentVersionNumber,
    currentVersionId: row.currentVersionId,
    sentVersionId: row.sentVersionId,
    acceptedVersionId: row.acceptedVersionId,
    sentAt: iso(row.sentAt),
    acceptedAt: iso(row.acceptedAt),
    archivedAt: iso(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity.toFixed(4),
      listPrice: item.listPrice.toFixed(2),
      unitPrice: item.unitPrice.toFixed(2),
      discountType: item.discountType as "percent" | "fixed",
      discountValue: item.discountValue.toFixed(4),
      discount: item.discount.toFixed(2),
      quoteDiscountShare: item.quoteDiscountShare.toFixed(2),
      taxRate: item.taxRate.toFixed(4),
      tax: item.tax.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
      total: item.total.toFixed(2),
      manualPriceOverride: item.manualPriceOverride,
      priceOverrideReason: item.priceOverrideReason,
      position: item.position,
    })),
  };
}

function notFound(): never { throw new ApiError(404, "QUOTE_NOT_FOUND", "Quote not found"); }

async function requireSettings(db: Tx | ReturnType<typeof getDb>, orgId: string) {
  const settings = await db.quoteSettings.findUnique({ where: { orgId } });
  if (!settings) throw new ApiError(503, "QUOTEFLOW_NOT_PROVISIONED", "QuoteFlow is not provisioned for this organization");
  return settings;
}

async function assertMember(db: Tx, context: DomainContext, userId: string) {
  const membership = await db.membership.findUnique({
    where: { userId_orgId: { orgId: context.orgId, userId } }, select: { id: true },
  });
  if (!membership) throw new ApiError(422, "INVALID_OWNER", "Owner is not a member of this organization");
}

async function allocateNumber(
  db: Tx | ReturnType<typeof getDb>,
  orgId: string,
  prefix: string,
  year: number,
): Promise<string> {
  const rows = await db.$queryRaw<Array<{ allocated: number }>>(Prisma.sql`
    INSERT INTO "QuoteNumberCounter" ("orgId", "year", "nextValue", "updatedAt")
    VALUES (${orgId}, ${year}, 2, NOW())
    ON CONFLICT ("orgId", "year") DO UPDATE
      SET "nextValue" = "QuoteNumberCounter"."nextValue" + 1, "updatedAt" = NOW()
    RETURNING "nextValue" - 1 AS allocated
  `);
  const allocated = Number(rows[0]?.allocated);
  if (!Number.isSafeInteger(allocated) || allocated < 1) throw new ApiError(500, "QUOTE_NUMBER_FAILED", "Could not allocate quote number");
  return `${prefix}-${year}-${String(allocated).padStart(6, "0")}`;
}

async function resolveCustomer(db: Tx, context: DomainContext, input: CreateQuoteInput | UpdateQuoteInput, current?: QuoteRow) {
  const customerId = Object.hasOwn(input, "customerId") ? input.customerId ?? null : current?.customerId ?? null;
  const leadId = Object.hasOwn(input, "leadId") ? input.leadId ?? null : current?.leadId ?? null;
  const [customer, lead] = await Promise.all([
    customerId ? db.customer.findFirst({ where: { id: customerId, orgId: context.orgId } }) : null,
    leadId ? db.lead.findFirst({ where: { id: leadId, orgId: context.orgId, archivedAt: null } }) : null,
  ]);
  if (customerId && !customer) throw new ApiError(422, "INVALID_CUSTOMER", "Customer is unavailable in this organization");
  if (leadId && !lead) throw new ApiError(422, "INVALID_LEAD", "Lead is unavailable in this organization");
  const name = input.customerName?.trim() || customer?.name || lead?.company || lead?.name || current?.customerName;
  if (!name) throw new ApiError(422, "CUSTOMER_REQUIRED", "Customer name, customerId, or leadId is required");
  return {
    customerId,
    leadId,
    customerName: name,
    customerEmail: Object.hasOwn(input, "customerEmail") ? clean(input.customerEmail) : customer?.email ?? lead?.email ?? current?.customerEmail ?? null,
    customerAddress: Object.hasOwn(input, "customerAddress") ? clean(input.customerAddress) : customer?.address ?? current?.customerAddress ?? null,
    customerTaxId: Object.hasOwn(input, "customerTaxId") ? clean(input.customerTaxId) : customer?.taxId ?? current?.customerTaxId ?? null,
  };
}

async function priceItems(
  db: Tx,
  context: DomainContext,
  currency: QuoteCurrency,
  rawItems: CreateQuoteInput["items"],
  quoteDiscountType: "percent" | "fixed",
  quoteDiscountValue: string,
  taxRate: string,
  taxIncluded: boolean,
) {
  const productIds = [...new Set(rawItems.flatMap((item) => item.productId ? [item.productId] : []))];
  const products = await db.product.findMany({ where: { orgId: context.orgId, id: { in: productIds }, active: true } });
  const byId = new Map(products.map((product) => [product.id, product]));
  if (products.length !== productIds.length) throw new ApiError(422, "INVALID_PRODUCT", "A product is unavailable in this organization");

  const items: PricingLineInput[] = rawItems.map((input, position) => {
    const product = input.productId ? byId.get(input.productId) : undefined;
    if (product && product.currency !== currency) {
      throw new ApiError(422, "CURRENCY_MISMATCH", "Product and quote currencies must match; automatic FX is not supported");
    }
    const listPrice = product?.price.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2) ?? input.unitPrice;
    if (!listPrice) throw new ApiError(422, "UNIT_PRICE_REQUIRED", "Free-form items require a unit price");
    const unitPrice = input.unitPrice ?? listPrice;
    const override = !product || !new Prisma.Decimal(unitPrice).equals(new Prisma.Decimal(listPrice));
    if (override && !canQuote(context, "quote.override_price")) {
      throw new ApiError(403, "PRICE_OVERRIDE_FORBIDDEN", "Manual price overrides require manager access");
    }
    if (override && !clean(input.priceOverrideReason)) {
      throw new ApiError(422, "PRICE_OVERRIDE_REASON_REQUIRED", "Manual price overrides require a reason");
    }
    return {
      productId: product?.id ?? null,
      productName: product?.name ?? input.productName!,
      description: clean(input.description) ?? product?.description ?? null,
      unit: product?.unit ?? input.unit,
      quantity: input.quantity,
      listPrice,
      unitPrice,
      discountType: input.discountType,
      discountValue: input.discountValue,
      manualPriceOverride: override,
      priceOverrideReason: override ? clean(input.priceOverrideReason) : null,
      position,
    };
  });
  return calculateAuthoritativePrice({ currency, items, quoteDiscountType, quoteDiscountValue, taxRate, taxIncluded });
}

async function appendEvent(db: Tx, context: DomainContext, input: {
  quoteId: string; quoteVersionId?: string | null; type: string; body: string; metadata?: Record<string, unknown>;
}) {
  await db.quoteEvent.create({ data: {
    orgId: context.orgId, quoteId: input.quoteId, quoteVersionId: input.quoteVersionId ?? null,
    actorId: context.userId, type: input.type, body: input.body,
    metadata: input.metadata ? json(input.metadata) : undefined,
    idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:${input.type}:${input.quoteId}` : null,
  } });
}

async function appendAudit(db: Tx, context: DomainContext, input: {
  quoteId: string; action: string; before?: Record<string, unknown>; after?: Record<string, unknown>;
}) {
  await db.auditLog.create({ data: {
    orgId: context.orgId, userId: context.userId, action: input.action,
    entityType: "Quote", entityId: input.quoteId,
    metadata: JSON.stringify({ initiatedBy: context.initiatedBy ?? "user", approvalId: context.approvalId ?? null,
      idempotencyKey: context.idempotencyKey ?? null, before: input.before ?? null, after: input.after ?? null }),
  } });
}

const AUTOMATION_TRIGGERS: Record<string, string[]> = {
  "quote.created": ["quote_created"], "quote.updated": ["quote_updated"],
  "quote.submitted": ["quote_submitted"], "quote.approved": ["quote_approved"],
  "quote.sent": ["quote_sent"], "quote.accepted": ["quote_accepted"], "quote.declined": ["quote_declined"],
};

async function queueAutomation(db: Tx, context: DomainContext, quoteId: string, eventType: keyof typeof AUTOMATION_TRIGGERS, key: string) {
  const triggerTypes = AUTOMATION_TRIGGERS[eventType];
  const automations = await db.automation.findMany({ where: { orgId: context.orgId, status: "active", triggerType: { in: triggerTypes } }, select: { id: true } });
  if (!automations.length) return;
  await db.automationRun.createMany({
    data: automations.map((automation) => ({ orgId: context.orgId, automationId: automation.id, status: "queued", eventType,
      idempotencyKey: `${key}:${automation.id}`, payload: JSON.stringify({ quoteId }) })), skipDuplicates: true,
  });
}

async function createVersion(db: Tx, context: DomainContext, quoteId: string, versionNumber: number) {
  const quote = await db.quote.findFirst({ where: { id: quoteId, orgId: context.orgId }, include: quoteInclude });
  if (!quote) notFound();
  const dto = toDto(quote);
  const version = await db.quoteVersion.create({ data: {
    orgId: context.orgId, quoteId, versionNumber, status: quote.status, currency: quote.currency,
    customerSnapshot: json({ id: quote.customerId, name: quote.customerName, email: quote.customerEmail, address: quote.customerAddress, taxId: quote.customerTaxId }),
    itemsSnapshot: json(dto.items.map(({ id: _id, ...item }) => item)),
    quoteSnapshot: json({ number: quote.number, leadId: quote.leadId, ownerId: quote.ownerId,
      quoteDiscountType: quote.quoteDiscountType, quoteDiscountValue: quote.quoteDiscountValue.toFixed(4),
      taxRate: quote.taxRate.toFixed(4), taxIncluded: quote.taxIncluded, revision: quote.revision }),
    subtotal: quote.subtotal, lineDiscount: quote.lineDiscount, quoteDiscount: quote.quoteDiscount,
    tax: quote.tax, total: quote.total, validUntil: quote.validUntil, terms: quote.terms, notes: quote.notes,
    templateVersion: (await requireSettings(db, context.orgId)).documentTemplateVersion, createdById: context.userId,
  } });
  await db.quote.update({ where: { id: quoteId }, data: { currentVersionId: version.id, currentVersionNumber: versionNumber } });
  return version;
}

async function replaceItems(db: Tx, quoteId: string, orgId: string, price: ReturnType<typeof calculateAuthoritativePrice>) {
  await db.quoteItem.deleteMany({ where: { quoteId, orgId } });
  await db.quoteItem.createMany({ data: price.lines.map((line) => ({
    quoteId, orgId, productId: line.productId, productName: line.productName, description: line.description,
    unit: line.unit, quantity: new Prisma.Decimal(line.quantity), listPrice: new Prisma.Decimal(line.listPrice),
    unitPrice: new Prisma.Decimal(line.unitPrice), discountType: line.discountType,
    discountValue: new Prisma.Decimal(line.discountValue), discount: new Prisma.Decimal(line.discount),
    quoteDiscountShare: new Prisma.Decimal(line.quoteDiscountShare), taxRate: new Prisma.Decimal(line.taxRate),
    tax: new Prisma.Decimal(line.tax), subtotal: new Prisma.Decimal(line.subtotal), total: new Prisma.Decimal(line.total),
    manualPriceOverride: line.manualPriceOverride, priceOverrideReason: line.priceOverrideReason, position: line.position,
  })) });
}

export async function createQuote(context: DomainContext, input: CreateQuoteInput): Promise<QuoteDto> {
  requireQuotePermission(context, "quote.create");
  const db = getDb();
  const numberingSettings = await requireSettings(db, context.orgId);
  const now = new Date();
  // Allocate in its own autocommit statement so concurrent quote transactions do
  // not hold the per-tenant counter lock while creating items and snapshots.
  // A failed quote may leave a harmless gap, but an allocated number is never reused.
  const number = await allocateNumber(
    db,
    context.orgId,
    numberingSettings.numberPrefix,
    now.getUTCFullYear(),
  );
  const id = await transactionWithRetry(db, async (tx) => {
    const settings = await requireSettings(tx, context.orgId);
    if (input.ownerId) await assertMember(tx, context, input.ownerId);
    const customer = await resolveCustomer(tx, context, input);
    const currency = (input.currency ?? settings.defaultCurrency) as QuoteCurrency;
    const taxRate = input.taxRate ?? settings.defaultTaxRate.toFixed(4);
    const taxIncluded = input.taxIncluded ?? settings.taxIncluded;
    const price = await priceItems(tx, context, currency, input.items, input.quoteDiscountType, input.quoteDiscountValue, taxRate, taxIncluded);
    const validUntil = input.validUntil === null ? null : input.validUntil ? new Date(input.validUntil) : new Date(now.getTime() + settings.defaultValidDays * 86_400_000);
    const quote = await tx.quote.create({ data: {
      orgId: context.orgId, number, ...customer, ownerId: input.ownerId ?? context.userId, createdById: context.userId,
      currency, subtotal: new Prisma.Decimal(price.subtotal), lineDiscount: new Prisma.Decimal(price.lineDiscount),
      quoteDiscount: new Prisma.Decimal(price.quoteDiscount), discount: new Prisma.Decimal(price.discount),
      tax: new Prisma.Decimal(price.tax), total: new Prisma.Decimal(price.total), quoteDiscountType: input.quoteDiscountType,
      quoteDiscountValue: new Prisma.Decimal(input.quoteDiscountValue), taxRate: new Prisma.Decimal(taxRate), taxIncluded,
      validUntil, terms: clean(input.terms), notes: clean(input.notes),
    }, select: { id: true } });
    await replaceItems(tx, quote.id, context.orgId, price);
    const version = await createVersion(tx, context, quote.id, 1);
    await appendEvent(tx, context, { quoteId: quote.id, quoteVersionId: version.id, type: "quote.created", body: "Quote created", metadata: { number } });
    await appendAudit(tx, context, { quoteId: quote.id, action: "quote.created", after: { number, versionId: version.id, total: price.total, currency } });
    await queueAutomation(tx, context, quote.id, "quote.created", `quote.created:${quote.id}:${version.id}`);
    return quote.id;
  }, Prisma.TransactionIsolationLevel.ReadCommitted);
  return getQuote(context, id);
}

export async function getQuote(context: DomainContext, quoteId: string): Promise<QuoteDto> {
  requireQuotePermission(context, "quote.read");
  const row = await getDb().quote.findFirst({ where: { id: quoteId, orgId: context.orgId }, include: quoteInclude });
  if (!row) notFound();
  return toDto(row);
}

export async function listQuotes(context: DomainContext, query: QuoteListQuery) {
  requireQuotePermission(context, "quote.read");
  const where: Prisma.QuoteWhereInput = {
    orgId: context.orgId, archivedAt: null,
    ...(query.status ? { status: query.status } : {}), ...(query.currency ? { currency: query.currency } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}), ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.q ? { OR: [
      { number: { contains: query.q, mode: "insensitive" } }, { customerName: { contains: query.q, mode: "insensitive" } },
      { customerEmail: { contains: query.q, mode: "insensitive" } },
    ] } : {}),
  };
  const db = getDb();
  const [items, total] = await Promise.all([
    db.quote.findMany({ where, include: quoteInclude, orderBy: [{ [query.sort]: query.direction }, { id: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    db.quote.count({ where }),
  ]);
  return { items: items.map(toDto), page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) };
}

export async function updateQuote(context: DomainContext, quoteId: string, input: UpdateQuoteInput): Promise<QuoteDto> {
  requireQuotePermission(context, "quote.update");
  const db = getDb();
  await transactionWithRetry(db, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Quote" WHERE "id" = ${quoteId} AND "orgId" = ${context.orgId} FOR UPDATE`);
    const current = await tx.quote.findFirst({ where: { id: quoteId, orgId: context.orgId }, include: quoteInclude });
    if (!current) notFound();
    if (current.revision !== input.expectedRevision) throw new ApiError(409, "REVISION_CONFLICT", "Quote was changed by another request", { currentRevision: current.revision });
    if (["accepted", "archived", "cancelled", "expired", "pending_approval"].includes(current.status)) {
      throw new ApiError(409, "QUOTE_IMMUTABLE", `A ${current.status} quote cannot be edited`);
    }
    if (input.ownerId) await assertMember(tx, context, input.ownerId);
    const settings = await requireSettings(tx, context.orgId);
    const customer = await resolveCustomer(tx, context, input, current);
    const currency = (input.currency ?? current.currency) as QuoteCurrency;
    const quoteDiscountType = input.quoteDiscountType ?? (current.quoteDiscountType as "percent" | "fixed");
    const quoteDiscountValue = input.quoteDiscountValue ?? current.quoteDiscountValue.toFixed(4);
    const taxRate = input.taxRate ?? current.taxRate.toFixed(4);
    const taxIncluded = input.taxIncluded ?? current.taxIncluded;
    if (!input.items && currency !== current.currency) {
      throw new ApiError(422, "ITEMS_REQUIRED_FOR_CURRENCY_CHANGE", "Changing quote currency requires resubmitting all items");
    }
    const price = input.items
      ? await priceItems(tx, context, currency, input.items, quoteDiscountType, quoteDiscountValue, taxRate, taxIncluded)
      : calculateAuthoritativePrice({
        currency,
        quoteDiscountType,
        quoteDiscountValue,
        taxRate,
        taxIncluded,
        items: current.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity.toFixed(4),
          listPrice: item.listPrice.toFixed(4),
          unitPrice: item.unitPrice.toFixed(4),
          discountType: item.discountType as "percent" | "fixed",
          discountValue: item.discountValue.toFixed(4),
          manualPriceOverride: item.manualPriceOverride,
          priceOverrideReason: item.priceOverrideReason,
          position: item.position,
        })),
      });
    const updated = await tx.quote.updateMany({ where: { id: quoteId, orgId: context.orgId, revision: input.expectedRevision }, data: {
      ...customer, ...(Object.hasOwn(input, "ownerId") ? { ownerId: input.ownerId ?? null } : {}),
      currency, subtotal: new Prisma.Decimal(price.subtotal), lineDiscount: new Prisma.Decimal(price.lineDiscount),
      quoteDiscount: new Prisma.Decimal(price.quoteDiscount), discount: new Prisma.Decimal(price.discount), tax: new Prisma.Decimal(price.tax), total: new Prisma.Decimal(price.total),
      quoteDiscountType, quoteDiscountValue: new Prisma.Decimal(quoteDiscountValue), taxRate: new Prisma.Decimal(taxRate), taxIncluded,
      ...(Object.hasOwn(input, "validUntil") ? { validUntil: input.validUntil ? new Date(input.validUntil) : null } : {}),
      ...(Object.hasOwn(input, "terms") ? { terms: clean(input.terms) } : {}), ...(Object.hasOwn(input, "notes") ? { notes: clean(input.notes) } : {}),
      revision: { increment: 1 }, status: "draft", sentVersionId: null, sentAt: null,
    } });
    if (updated.count !== 1) throw new ApiError(409, "REVISION_CONFLICT", "Quote was changed by another request");
    await replaceItems(tx, quoteId, context.orgId, price);
    const version = await createVersion(tx, context, quoteId, current.currentVersionNumber + 1);
    await appendEvent(tx, context, { quoteId, quoteVersionId: version.id, type: "quote.updated", body: "Quote revised", metadata: { revision: current.revision + 1 } });
    await appendAudit(tx, context, { quoteId, action: "quote.updated", before: { revision: current.revision, status: current.status }, after: { revision: current.revision + 1, versionId: version.id, total: price.total } });
    await queueAutomation(tx, context, quoteId, "quote.updated", `quote.updated:${quoteId}:${version.id}`);
    void settings;
  });
  return getQuote(context, quoteId);
}

async function transition(context: DomainContext, quoteId: string, input: {
  permission: Parameters<typeof requireQuotePermission>[1]; from: string[]; to: QuoteStatus; expectedRevision: number;
  event: keyof typeof AUTOMATION_TRIGGERS | "quote.rejected" | "quote.archived"; reason?: string; requireApprovedVersion?: boolean;
}) {
  requireQuotePermission(context, input.permission);
  const db = getDb();
  await transactionWithRetry(db, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Quote" WHERE "id" = ${quoteId} AND "orgId" = ${context.orgId} FOR UPDATE`);
    const quote = await tx.quote.findFirst({ where: { id: quoteId, orgId: context.orgId } });
    if (!quote) notFound();
    if (quote.revision !== input.expectedRevision) throw new ApiError(409, "REVISION_CONFLICT", "Quote was changed by another request", { currentRevision: quote.revision });
    if (!input.from.includes(quote.status)) throw new ApiError(409, "INVALID_QUOTE_TRANSITION", `Cannot change quote from ${quote.status} to ${input.to}`);
    if (!quote.currentVersionId) throw new ApiError(409, "QUOTE_VERSION_REQUIRED", "Quote has no current immutable version");
    if (input.requireApprovedVersion) {
      const approval = await tx.quoteApproval.findFirst({ where: { orgId: context.orgId, quoteId, quoteVersionId: quote.currentVersionId, status: "approved" } });
      if (!approval) throw new ApiError(409, "VERSION_NOT_APPROVED", "The current quote version is not approved");
    }
    const now = new Date();
    const updated = await tx.quote.updateMany({ where: { id: quoteId, orgId: context.orgId, revision: input.expectedRevision }, data: {
      status: input.to, revision: { increment: 1 },
      ...(input.to === "sent" ? { sentVersionId: quote.currentVersionId, sentAt: now } : {}),
      ...(input.to === "accepted" ? { acceptedVersionId: quote.currentVersionId, acceptedAt: now, acceptedSource: context.initiatedBy ?? "user" } : {}),
      ...(input.to === "archived" ? { archivedAt: now } : {}),
    } });
    if (updated.count !== 1) throw new ApiError(409, "REVISION_CONFLICT", "Quote was changed by another request");
    await appendEvent(tx, context, { quoteId, quoteVersionId: quote.currentVersionId, type: input.event, body: `Quote ${input.to}`, metadata: input.reason ? { reason: input.reason } : undefined });
    await appendAudit(tx, context, { quoteId, action: input.event, before: { status: quote.status, revision: quote.revision }, after: { status: input.to, revision: quote.revision + 1, versionId: quote.currentVersionId } });
    if (input.event in AUTOMATION_TRIGGERS) await queueAutomation(tx, context, quoteId, input.event as keyof typeof AUTOMATION_TRIGGERS, `${input.event}:${quoteId}:${quote.currentVersionId}`);
  });
  return getQuote(context, quoteId);
}

export async function submitQuote(context: DomainContext, quoteId: string, expectedRevision: number, reason?: string) {
  requireQuotePermission(context, "quote.submit");
  const settings = await requireSettings(getDb(), context.orgId);
  if (!settings.approvalRequired) return transition(context, quoteId, { permission: "quote.submit", from: ["draft"], to: "approved", expectedRevision, event: "quote.approved", reason });
  const db = getDb();
  await transactionWithRetry(db, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Quote" WHERE "id" = ${quoteId} AND "orgId" = ${context.orgId} FOR UPDATE`);
    const quote = await tx.quote.findFirst({ where: { id: quoteId, orgId: context.orgId } });
    if (!quote) notFound();
    if (quote.revision !== expectedRevision) throw new ApiError(409, "REVISION_CONFLICT", "Quote was changed by another request", { currentRevision: quote.revision });
    if (quote.status !== "draft") throw new ApiError(409, "INVALID_QUOTE_TRANSITION", "Only a draft quote can be submitted; rejected quotes must be revised first");
    if (!quote.currentVersionId) throw new ApiError(409, "QUOTE_VERSION_REQUIRED", "Quote has no current immutable version");
    await tx.quoteApproval.create({ data: { orgId: context.orgId, quoteId, quoteVersionId: quote.currentVersionId, requestedById: context.userId, requestReason: clean(reason) } });
    await tx.quote.update({ where: { id: quoteId }, data: { status: "pending_approval", revision: { increment: 1 } } });
    await appendEvent(tx, context, { quoteId, quoteVersionId: quote.currentVersionId, type: "quote.submitted", body: "Quote submitted for approval", metadata: reason ? { reason } : undefined });
    await appendAudit(tx, context, { quoteId, action: "quote.submitted", before: { status: quote.status }, after: { status: "pending_approval", versionId: quote.currentVersionId } });
    await queueAutomation(tx, context, quoteId, "quote.submitted", `quote.submitted:${quoteId}:${quote.currentVersionId}`);
  });
  return getQuote(context, quoteId);
}

async function decideApproval(context: DomainContext, quoteId: string, expectedRevision: number, approved: boolean, reason?: string) {
  requireQuotePermission(context, "quote.approve");
  const db = getDb();
  await transactionWithRetry(db, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Quote" WHERE "id" = ${quoteId} AND "orgId" = ${context.orgId} FOR UPDATE`);
    const quote = await tx.quote.findFirst({ where: { id: quoteId, orgId: context.orgId } });
    if (!quote) notFound();
    if (quote.revision !== expectedRevision) throw new ApiError(409, "REVISION_CONFLICT", "Quote was changed by another request", { currentRevision: quote.revision });
    if (quote.status !== "pending_approval" || !quote.currentVersionId) throw new ApiError(409, "INVALID_QUOTE_TRANSITION", "Quote is not pending approval");
    const pending = await tx.quoteApproval.findFirst({ where: { orgId: context.orgId, quoteId, quoteVersionId: quote.currentVersionId, status: "pending" } });
    if (!pending) throw new ApiError(409, "APPROVAL_NOT_FOUND", "Pending approval for the current version was not found");
    const status = approved ? "approved" : "rejected";
    await tx.quoteApproval.update({ where: { id: pending.id }, data: { status, decidedById: context.userId, decisionReason: clean(reason), decidedAt: new Date() } });
    await tx.quote.update({ where: { id: quoteId }, data: { status, revision: { increment: 1 } } });
    const event = approved ? "quote.approved" : "quote.rejected";
    await appendEvent(tx, context, { quoteId, quoteVersionId: quote.currentVersionId, type: event, body: approved ? "Quote approved" : "Quote rejected", metadata: reason ? { reason } : undefined });
    await appendAudit(tx, context, { quoteId, action: event, before: { status: quote.status }, after: { status, versionId: quote.currentVersionId, approvalId: pending.id } });
    if (approved) await queueAutomation(tx, context, quoteId, "quote.approved", `quote.approved:${quoteId}:${quote.currentVersionId}`);
  });
  return getQuote(context, quoteId);
}

export const approveQuote = (context: DomainContext, quoteId: string, expectedRevision: number, reason?: string) => decideApproval(context, quoteId, expectedRevision, true, reason);
export const rejectQuote = (context: DomainContext, quoteId: string, expectedRevision: number, reason?: string) => decideApproval(context, quoteId, expectedRevision, false, reason);
export const sendQuote = (context: DomainContext, quoteId: string, expectedRevision: number) => transition(context, quoteId, { permission: "quote.send", from: ["approved"], to: "sent", expectedRevision, event: "quote.sent", requireApprovedVersion: true });
export const acceptQuote = (context: DomainContext, quoteId: string, expectedRevision: number, reason?: string) => transition(context, quoteId, { permission: "quote.decide", from: ["sent"], to: "accepted", expectedRevision, event: "quote.accepted", reason, requireApprovedVersion: true });
export const declineQuote = (context: DomainContext, quoteId: string, expectedRevision: number, reason?: string) => transition(context, quoteId, { permission: "quote.decide", from: ["sent"], to: "declined", expectedRevision, event: "quote.declined", reason, requireApprovedVersion: true });
export const archiveQuote = (context: DomainContext, quoteId: string, expectedRevision: number) => transition(context, quoteId, { permission: "quote.archive", from: ["draft", "rejected", "declined", "cancelled", "expired"], to: "archived", expectedRevision, event: "quote.archived" });

export async function listQuoteVersions(context: DomainContext, quoteId: string) {
  requireQuotePermission(context, "quote.read");
  const quote = await getDb().quote.findFirst({ where: { id: quoteId, orgId: context.orgId }, select: { id: true } });
  if (!quote) notFound();
  const versions = await getDb().quoteVersion.findMany({ where: { quoteId, orgId: context.orgId }, orderBy: { versionNumber: "desc" }, include: { approvals: { orderBy: { requestedAt: "desc" } }, documents: { orderBy: { generatedAt: "desc" } } } });
  return versions.map((version) => ({
    id: version.id,
    quoteId: version.quoteId,
    versionNumber: version.versionNumber,
    status: version.status,
    currency: version.currency,
    customerSnapshot: version.customerSnapshot,
    itemsSnapshot: version.itemsSnapshot,
    quoteSnapshot: version.quoteSnapshot,
    subtotal: version.subtotal.toFixed(2),
    lineDiscount: version.lineDiscount.toFixed(2),
    quoteDiscount: version.quoteDiscount.toFixed(2),
    tax: version.tax.toFixed(2),
    total: version.total.toFixed(2),
    validUntil: iso(version.validUntil),
    terms: version.terms,
    notes: version.notes,
    templateVersion: version.templateVersion,
    createdAt: version.createdAt.toISOString(),
    approvals: version.approvals.map((approval) => ({
      id: approval.id, status: approval.status, requestReason: approval.requestReason,
      decisionReason: approval.decisionReason, requestedAt: approval.requestedAt.toISOString(),
      decidedAt: iso(approval.decidedAt),
    })),
    documents: version.documents.map((document) => ({
      id: document.id, format: document.format, templateVersion: document.templateVersion,
      contentHash: document.contentHash, storagePath: document.storagePath,
      generatedAt: document.generatedAt.toISOString(),
    })),
  }));
}

export async function generateQuoteDocument(
  context: DomainContext,
  quoteId: string,
  versionId?: string,
  format: DocumentFormat = "pdf",
  locale: DocumentLocale = "en",
) {
  requireQuotePermission(context, "quote.generate_document");
  return generateQuoteArtifact(context, quoteId, versionId, format, locale);
}

export async function getQuoteOverview(context: DomainContext) {
  requireQuotePermission(context, "quote.read");
  const db = getDb();
  const settings = await requireSettings(db, context.orgId);
  const [quotes, products, customers, leads, members, pendingApprovals, grouped] = await Promise.all([
    db.quote.findMany({ where: { orgId: context.orgId, archivedAt: null }, include: quoteInclude, orderBy: { updatedAt: "desc" }, take: 100 }),
    db.product.findMany({ where: { orgId: context.orgId }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.customer.findMany({ where: { orgId: context.orgId }, orderBy: { name: "asc" }, take: 200 }),
    db.lead.findMany({ where: { orgId: context.orgId, archivedAt: null }, select: { id: true, name: true, company: true, email: true, value: true, currency: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
    db.membership.findMany({ where: { orgId: context.orgId }, include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } }),
    db.quoteApproval.findMany({ where: { orgId: context.orgId, status: "pending" }, include: { version: { select: { versionNumber: true, total: true, currency: true } } }, orderBy: { requestedAt: "asc" } }),
    db.quote.groupBy({ by: ["currency", "status"], where: { orgId: context.orgId, archivedAt: null }, _count: { _all: true }, _sum: { total: true } }),
  ]);
  return {
    quotes: quotes.map(toDto),
    products: products.map((p) => ({ ...p, price: p.price.toFixed(2), updatedAt: p.updatedAt.toISOString() })),
    customers: customers.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
    leads: leads.map((l) => ({ ...l, value: l.value.toFixed(2) })),
    members: members.map((m) => ({ role: m.role, ...m.user })),
    pendingApprovals: pendingApprovals.map((a) => ({ ...a, requestedAt: a.requestedAt.toISOString(), decidedAt: iso(a.decidedAt), version: { ...a.version, total: a.version.total.toFixed(2) } })),
    settings: { ...settings, defaultTaxRate: settings.defaultTaxRate.toFixed(4), discountThresholdPct: settings.discountThresholdPct?.toFixed(4) ?? null, valueThreshold: settings.valueThreshold?.toFixed(2) ?? null, updatedAt: settings.updatedAt.toISOString() },
    kpis: grouped.map((row) => ({ currency: row.currency, status: row.status, count: row._count._all, total: row._sum.total?.toFixed(2) ?? "0.00" })),
  };
}

export async function getQuoteSettings(context: DomainContext) {
  requireQuotePermission(context, "quote.read");
  const settings = await requireSettings(getDb(), context.orgId);
  return { ...settings, defaultTaxRate: settings.defaultTaxRate.toFixed(4), discountThresholdPct: settings.discountThresholdPct?.toFixed(4) ?? null, valueThreshold: settings.valueThreshold?.toFixed(2) ?? null, updatedAt: settings.updatedAt.toISOString() };
}

export async function updateQuoteSettings(context: DomainContext, input: UpdateQuoteSettingsInput) {
  requireQuotePermission(context, "settings.manage");
  const settings = await getDb().quoteSettings.update({ where: { orgId: context.orgId }, data: {
    ...input,
    ...(input.defaultTaxRate !== undefined ? { defaultTaxRate: new Prisma.Decimal(input.defaultTaxRate) } : {}),
    ...(input.discountThresholdPct !== undefined ? { discountThresholdPct: input.discountThresholdPct === null ? null : new Prisma.Decimal(input.discountThresholdPct) } : {}),
    ...(input.valueThreshold !== undefined ? { valueThreshold: input.valueThreshold === null ? null : new Prisma.Decimal(input.valueThreshold) } : {}),
  } });
  return { ...settings, defaultTaxRate: settings.defaultTaxRate.toFixed(4), discountThresholdPct: settings.discountThresholdPct?.toFixed(4) ?? null, valueThreshold: settings.valueThreshold?.toFixed(2) ?? null, updatedAt: settings.updatedAt.toISOString() };
}

export async function listProducts(context: DomainContext) {
  requireQuotePermission(context, "quote.read");
  const products = await getDb().product.findMany({ where: { orgId: context.orgId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  return products.map((p) => ({ ...p, price: p.price.toFixed(2), updatedAt: p.updatedAt.toISOString() }));
}

export async function createProduct(context: DomainContext, input: ProductInput) {
  requireQuotePermission(context, "catalog.manage");
  return createErpProduct(context, { ...input, type: "NON_STOCKED_PRODUCT", cost: "0" });
}

export async function updateProduct(context: DomainContext, productId: string, input: ProductUpdateInput) {
  requireQuotePermission(context, "catalog.manage");
  return updateErpProduct(context, productId, input);
}

export async function archiveProduct(context: DomainContext, productId: string) {
  requireQuotePermission(context, "catalog.manage");
  return archiveErpProduct(context, productId);
}

export async function getQuoteSummaryForOwnerAi(context: DomainContext) {
  const overview = await getQuoteOverview(context);
  return { kpis: overview.kpis, recentQuotes: overview.quotes.slice(0, 10), pendingApprovals: overview.pendingApprovals };
}

export async function getExpiringQuotesForOwnerAi(context: DomainContext, days = 14) {
  requireQuotePermission(context, "quote.read");
  const now = new Date();
  const until = new Date(now.getTime() + Math.min(Math.max(days, 1), 365) * 86_400_000);
  const rows = await getDb().quote.findMany({ where: { orgId: context.orgId, archivedAt: null, status: { in: ["approved", "sent"] }, validUntil: { gte: now, lte: until } }, include: quoteInclude, orderBy: { validUntil: "asc" }, take: 100 });
  return rows.map(toDto);
}

export async function searchQuotesForOwnerAi(context: DomainContext, query: string) {
  return (await listQuotes(context, { q: query, sort: "updatedAt", direction: "desc", page: 1, limit: 20 })).items;
}
