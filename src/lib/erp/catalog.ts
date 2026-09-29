import "server-only";

import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { appendAudit, clean, money } from "./common";
import { requireErpPermission } from "./permissions";
import type {
  CustomerInput,
  CustomerUpdateInput,
  ProductInput,
  ProductUpdateInput,
  WarehouseInput,
} from "./schemas";
import type { CustomerDto, DomainContext, PageResult, ProductDto, ProductType } from "./types";

function uniqueConflict(error: unknown, label: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, `${label.toUpperCase()}_CONFLICT`, `${label} already exists in this organization`);
  }
  throw error;
}

function customerDto(row: {
  id: string; sourceLeadId: string | null; name: string; email: string | null; phone: string | null;
  address: string | null; taxId: string | null; type: string; archivedAt: Date | null; createdAt: Date; updatedAt: Date;
}): CustomerDto {
  return {
    id: row.id,
    sourceLeadId: row.sourceLeadId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    taxId: row.taxId,
    type: row.type as CustomerDto["type"],
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function productDto(row: {
  id: string; sku: string; name: string; description: string | null; type: string; price: Prisma.Decimal;
  cost: Prisma.Decimal; currency: string; unit: string; lowStockThreshold: Prisma.Decimal | null;
  active: boolean; archivedAt: Date | null; createdAt: Date; updatedAt: Date;
}): ProductDto {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    type: row.type as ProductType,
    price: row.price.toFixed(4),
    cost: row.cost.toFixed(4),
    currency: row.currency,
    unit: row.unit,
    lowStockThreshold: row.lowStockThreshold?.toFixed(4) ?? null,
    active: row.active,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCustomers(
  context: DomainContext,
  input: { cursor?: string; limit: number; q?: string; type?: "individual" | "business"; includeArchived: boolean },
): Promise<PageResult<CustomerDto>> {
  requireErpPermission(context, "erp.read");
  const rows = await getDb().customer.findMany({
    where: {
      orgId: context.orgId,
      ...(input.includeArchived ? {} : { archivedAt: null }),
      ...(input.type ? { type: input.type } : {}),
      ...(input.q ? { OR: [
        { name: { contains: input.q, mode: "insensitive" } },
        { email: { contains: input.q, mode: "insensitive" } },
        { taxId: { contains: input.q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: { id: "asc" },
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  return { items: page.map(customerDto), nextCursor: hasMore ? page.at(-1)?.id ?? null : null };
}

export async function createCustomer(context: DomainContext, input: CustomerInput): Promise<CustomerDto> {
  requireErpPermission(context, "customer.manage");
  const db = getDb();
  try {
    return await db.$transaction(async (tx) => {
      if (input.sourceLeadId) {
        const lead = await tx.lead.findFirst({ where: { id: input.sourceLeadId, orgId: context.orgId, archivedAt: null }, select: { id: true } });
        if (!lead) throw new ApiError(422, "INVALID_LEAD", "Source lead is unavailable in this organization");
      }
      const row = await tx.customer.create({ data: {
        orgId: context.orgId,
        sourceLeadId: input.sourceLeadId ?? null,
        name: input.name,
        email: clean(input.email),
        phone: clean(input.phone),
        address: clean(input.address),
        taxId: clean(input.taxId),
        type: input.type,
        createdById: context.userId,
      } });
      await appendAudit(tx, context, "customer.created", "Customer", row.id, { name: row.name, sourceLeadId: row.sourceLeadId });
      return customerDto(row);
    });
  } catch (error) { return uniqueConflict(error, "customer"); }
}

export async function updateCustomer(context: DomainContext, customerId: string, input: CustomerUpdateInput): Promise<CustomerDto> {
  requireErpPermission(context, "customer.manage");
  const db = getDb();
  const row = await db.$transaction(async (tx) => {
    const current = await tx.customer.findFirst({ where: { id: customerId, orgId: context.orgId, archivedAt: null } });
    if (!current) throw new ApiError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    const updated = await tx.customer.update({ where: { id: current.id }, data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: clean(input.email) } : {}),
      ...(input.phone !== undefined ? { phone: clean(input.phone) } : {}),
      ...(input.address !== undefined ? { address: clean(input.address) } : {}),
      ...(input.taxId !== undefined ? { taxId: clean(input.taxId) } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
    } });
    await appendAudit(tx, context, "customer.updated", "Customer", customerId, { before: customerDto(current), after: customerDto(updated) });
    return updated;
  });
  return customerDto(row);
}

export async function archiveCustomer(context: DomainContext, customerId: string): Promise<{ archived: true }> {
  requireErpPermission(context, "customer.manage");
  await getDb().$transaction(async (tx) => {
    const result = await tx.customer.updateMany({ where: { id: customerId, orgId: context.orgId, archivedAt: null }, data: { archivedAt: new Date() } });
    if (result.count !== 1) throw new ApiError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
    await appendAudit(tx, context, "customer.archived", "Customer", customerId);
  });
  return { archived: true };
}

export async function listProducts(
  context: DomainContext,
  input: { cursor?: string; limit: number; q?: string; type?: ProductType; active?: boolean; includeArchived: boolean },
): Promise<PageResult<ProductDto>> {
  requireErpPermission(context, "erp.read");
  const rows = await getDb().product.findMany({
    where: {
      orgId: context.orgId,
      ...(input.includeArchived ? {} : { archivedAt: null }),
      ...(input.type ? { type: input.type } : {}),
      ...(input.active === undefined ? {} : { active: input.active }),
      ...(input.q ? { OR: [
        { sku: { contains: input.q, mode: "insensitive" } },
        { name: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: { id: "asc" },
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  return { items: page.map(productDto), nextCursor: hasMore ? page.at(-1)?.id ?? null : null };
}

export async function createProduct(context: DomainContext, input: ProductInput): Promise<ProductDto> {
  requireErpPermission(context, "product.manage");
  try {
    return await getDb().$transaction(async (tx) => {
      const row = await tx.product.create({ data: {
        orgId: context.orgId,
        sku: input.sku,
        name: input.name,
        description: clean(input.description),
        type: input.type,
        price: money(input.price),
        cost: money(input.cost),
        currency: input.currency,
        unit: input.unit,
        lowStockThreshold: input.lowStockThreshold ? money(input.lowStockThreshold) : null,
        active: input.active,
        stock: 0,
      } });
      await appendAudit(tx, context, "product.created", "Product", row.id, { sku: row.sku, type: row.type });
      return productDto(row);
    });
  } catch (error) { return uniqueConflict(error, "product SKU"); }
}

export async function updateProduct(context: DomainContext, productId: string, input: ProductUpdateInput): Promise<ProductDto> {
  requireErpPermission(context, "product.manage");
  try {
    const row = await getDb().$transaction(async (tx) => {
      const current = await tx.product.findFirst({ where: { id: productId, orgId: context.orgId, archivedAt: null } });
      if (!current) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
      if (input.type && input.type !== current.type) {
        const used = await tx.inventoryMovement.count({ where: { orgId: context.orgId, productId } });
        if (used > 0) throw new ApiError(409, "PRODUCT_TYPE_IMMUTABLE", "A product with inventory history cannot change type");
      }
      const updated = await tx.product.update({ where: { id: current.id }, data: {
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: clean(input.description) } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.price !== undefined ? { price: money(input.price) } : {}),
        ...(input.cost !== undefined ? { cost: money(input.cost) } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.lowStockThreshold !== undefined ? { lowStockThreshold: input.lowStockThreshold ? money(input.lowStockThreshold) : null } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      } });
      await appendAudit(tx, context, "product.updated", "Product", productId, { sku: updated.sku, type: updated.type });
      return updated;
    });
    return productDto(row);
  } catch (error) { return uniqueConflict(error, "product SKU"); }
}

export async function archiveProduct(context: DomainContext, productId: string): Promise<{ archived: true }> {
  requireErpPermission(context, "product.manage");
  await getDb().$transaction(async (tx) => {
    const result = await tx.product.updateMany({
      where: { id: productId, orgId: context.orgId, archivedAt: null },
      data: { active: false, archivedAt: new Date() },
    });
    if (result.count !== 1) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
    await appendAudit(tx, context, "product.archived", "Product", productId);
  });
  return { archived: true };
}

export async function listWarehouses(context: DomainContext) {
  requireErpPermission(context, "erp.read");
  const rows = await getDb().warehouse.findMany({ where: { orgId: context.orgId, archivedAt: null }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  return rows.map((row) => ({ ...row, archivedAt: row.archivedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
}

export async function createWarehouse(context: DomainContext, input: WarehouseInput) {
  requireErpPermission(context, "warehouse.manage");
  try {
    return await getDb().$transaction(async (tx) => {
      const row = await tx.warehouse.create({ data: { orgId: context.orgId, code: input.code.toUpperCase(), name: input.name } });
      await appendAudit(tx, context, "warehouse.created", "Warehouse", row.id, { code: row.code, name: row.name });
      return { ...row, archivedAt: null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
    });
  } catch (error) { return uniqueConflict(error, "warehouse code"); }
}
