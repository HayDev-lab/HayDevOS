import { z } from "zod";
import { ORDER_STATUSES, PRODUCT_TYPES } from "./types";

export const erpIdSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const currencySchema = z.string().trim().regex(/^[A-Z]{3}$/);
export const quantitySchema = z.string().trim().regex(/^\d{1,15}(?:\.\d{1,4})?$/)
  .refine((value) => !/^0+(?:\.0+)?$/.test(value), "Quantity must be greater than zero");
export const signedQuantitySchema = z.string().trim().regex(/^-?\d{1,15}(?:\.\d{1,4})?$/)
  .refine((value) => !/^-?0+(?:\.0+)?$/.test(value), "Quantity delta cannot be zero");
export const moneySchema = z.string().trim().regex(/^\d{1,15}(?:\.\d{1,4})?$/);
const nullableText = (max: number) => z.union([z.string().trim().max(max), z.null()]).optional();

export const cursorListSchema = z.object({
  cursor: erpIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(200).optional(),
}).strict();

export const customerListSchema = cursorListSchema.extend({
  type: z.enum(["individual", "business"]).optional(),
  includeArchived: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
}).strict();

export const customerInputSchema = z.object({
  sourceLeadId: erpIdSchema.optional(),
  name: z.string().trim().min(1).max(240),
  email: z.union([z.string().trim().email().max(320), z.literal(""), z.null()]).optional(),
  phone: nullableText(80),
  address: nullableText(500),
  taxId: nullableText(120),
  type: z.enum(["individual", "business"]).default("business"),
}).strict();

export const customerUpdateSchema = customerInputSchema.omit({ sourceLeadId: true }).partial().strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const productListSchema = cursorListSchema.extend({
  type: z.enum(PRODUCT_TYPES).optional(),
  active: z.enum(["true", "false"]).optional().transform((value) => value === undefined ? undefined : value === "true"),
  includeArchived: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
}).strict();

export const erpProductInputSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(240),
  description: nullableText(2_000),
  type: z.enum(PRODUCT_TYPES),
  price: moneySchema,
  cost: moneySchema.default("0"),
  currency: currencySchema,
  unit: z.string().trim().min(1).max(40).default("each"),
  lowStockThreshold: z.union([quantitySchema, z.null()]).optional(),
  active: z.boolean().default(true),
}).strict();

export const erpProductUpdateSchema = erpProductInputSchema.partial().strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const warehouseInputSchema = z.object({
  code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1).max(160),
}).strict();

export const orderListSchema = cursorListSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  customerId: erpIdSchema.optional(),
  currency: currencySchema.optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID", "OVERPAID"]).optional(),
  sort: z.enum(["createdAt", "number", "status", "total"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const createOrderFromQuoteSchema = z.object({ quoteId: erpIdSchema }).strict();
export const orderRevisionSchema = z.object({
  expectedRevision: z.number().int().positive(),
  reason: z.string().trim().min(1).max(2_000).optional(),
}).strict();
export const confirmOrderSchema = orderRevisionSchema.extend({ warehouseId: erpIdSchema.optional() }).strict();

export const receiveInventorySchema = z.object({
  warehouseId: erpIdSchema,
  productId: erpIdSchema,
  quantity: quantitySchema,
  reason: z.string().trim().min(1).max(1_000),
  reference: z.string().trim().max(240).optional(),
}).strict();

export const adjustInventorySchema = z.object({
  warehouseId: erpIdSchema,
  productId: erpIdSchema,
  delta: signedQuantitySchema,
  reason: z.string().trim().min(1).max(1_000),
  reference: z.string().trim().max(240).optional(),
}).strict();

export const transferInventorySchema = z.object({
  fromWarehouseId: erpIdSchema,
  toWarehouseId: erpIdSchema,
  productId: erpIdSchema,
  quantity: quantitySchema,
  reason: z.string().trim().min(1).max(1_000),
  reference: z.string().trim().max(240).optional(),
}).strict().refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
  message: "Source and destination warehouses must differ",
  path: ["toWarehouseId"],
});

export const inventoryListSchema = cursorListSchema.extend({
  warehouseId: erpIdSchema.optional(),
  productId: erpIdSchema.optional(),
  availability: z.enum(["all", "available", "low", "out"]).default("all"),
}).strict();

export const movementListSchema = cursorListSchema.extend({
  warehouseId: erpIdSchema.optional(),
  productId: erpIdSchema.optional(),
}).strict();

export const fulfillmentInputSchema = z.object({
  expectedRevision: z.number().int().positive(),
  note: z.string().trim().max(2_000).optional(),
  items: z.array(z.object({ orderItemId: erpIdSchema, quantity: quantitySchema }).strict()).min(1).max(100),
}).strict().superRefine((value, ctx) => {
  const seen = new Set<string>();
  value.items.forEach((item, index) => {
    if (seen.has(item.orderItemId)) ctx.addIssue({ code: "custom", message: "Duplicate order item", path: ["items", index, "orderItemId"] });
    seen.add(item.orderItemId);
  });
});

export const paymentInputSchema = z.object({
  orderId: erpIdSchema,
  invoiceId: erpIdSchema.optional(),
  amount: quantitySchema,
  currency: currencySchema,
  method: z.enum(["card", "bank", "cash", "crypto", "wallet", "other"]),
  reference: z.string().trim().max(240).optional(),
}).strict();

export const paymentDecisionSchema = z.object({ reason: z.string().trim().max(1_000).optional() }).strict();
export const paymentRefundSchema = z.object({
  amount: quantitySchema,
  reason: z.string().trim().min(1).max(1_000),
  reference: z.string().trim().max(240).optional(),
}).strict();

export const paymentListSchema = cursorListSchema.extend({
  orderId: erpIdSchema.optional(),
  status: z.enum(["PENDING", "CONFIRMED", "VOIDED"]).optional(),
  currency: currencySchema.optional(),
}).strict();

export const linkOrderDocumentSchema = z.object({ documentId: erpIdSchema }).strict();

export function parseIdempotencyKey(value: string | null): string | undefined {
  if (!value) return undefined;
  return z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9:._-]+$/).parse(value);
}

export type CustomerInput = z.infer<typeof customerInputSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type ProductInput = z.infer<typeof erpProductInputSchema>;
export type ProductUpdateInput = z.infer<typeof erpProductUpdateSchema>;
export type WarehouseInput = z.infer<typeof warehouseInputSchema>;
export type OrderListInput = z.infer<typeof orderListSchema>;
export type InventoryListInput = z.infer<typeof inventoryListSchema>;
export type MovementListInput = z.infer<typeof movementListSchema>;
export type FulfillmentInput = z.infer<typeof fulfillmentInputSchema>;
export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type PaymentListInput = z.infer<typeof paymentListSchema>;
