import { z } from "zod";
import { QUOTE_STATUSES } from "./types";

export const idSchema = z.string().trim().min(1).max(128);
export const currencySchema = z.enum(["AMD", "USD", "EUR"]);
export const discountTypeSchema = z.enum(["percent", "fixed"]);

const decimalString = (wholeDigits = 15, decimals = 4) => z.union([
  z.string().trim().regex(new RegExp(`^\\d{1,${wholeDigits}}(?:\\.\\d{1,${decimals}})?$`)),
  z.number().finite().nonnegative().max(Number("9".repeat(Math.min(wholeDigits, 15)))),
]).transform(String);

export const moneySchema = decimalString(15, 4);
export const rateSchema = decimalString(3, 4).refine((value) => Number(value) <= 100, "Rate cannot exceed 100");
export const quantitySchema = decimalString(15, 4).refine((value) => Number(value) > 0, "Quantity must be positive");
const nullableText = (max: number) => z.union([z.string().trim().max(max), z.null()]).optional();

export const quoteItemInputSchema = z.object({
  productId: z.union([idSchema, z.null()]).optional(),
  productName: z.string().trim().min(1).max(240).optional(),
  description: nullableText(2_000),
  unit: z.string().trim().min(1).max(40).default("each"),
  quantity: quantitySchema.default("1"),
  unitPrice: moneySchema.optional(),
  discountType: discountTypeSchema.default("percent"),
  discountValue: moneySchema.default("0"),
  priceOverrideReason: nullableText(500),
}).strict();

export const createQuoteSchema = z.object({
  leadId: z.union([idSchema, z.null()]).optional(),
  customerId: z.union([idSchema, z.null()]).optional(),
  customerName: z.string().trim().min(1).max(240).optional(),
  customerEmail: z.union([z.string().trim().email().max(320), z.literal(""), z.null()]).optional(),
  customerAddress: nullableText(1_000),
  customerTaxId: nullableText(100),
  ownerId: z.union([idSchema, z.null()]).optional(),
  currency: currencySchema.optional(),
  quoteDiscountType: discountTypeSchema.default("percent"),
  quoteDiscountValue: moneySchema.default("0"),
  taxRate: rateSchema.optional(),
  taxIncluded: z.boolean().optional(),
  validUntil: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
  terms: nullableText(10_000),
  notes: nullableText(10_000),
  items: z.array(quoteItemInputSchema).min(1).max(200),
}).strict();

export const updateQuoteSchema = createQuoteSchema.partial().extend({
  expectedRevision: z.number().int().positive(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== "expectedRevision"), "At least one change is required");

export const quoteListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(QUOTE_STATUSES).optional(),
  currency: currencySchema.optional(),
  customerId: idSchema.optional(),
  ownerId: idSchema.optional(),
  sort: z.enum(["createdAt", "updatedAt", "number", "customerName", "total", "validUntil"]).default("updatedAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).strict();

export const expectedRevisionSchema = z.object({ expectedRevision: z.number().int().positive() }).strict();
export const reasonSchema = z.object({ reason: z.string().trim().min(1).max(2_000) }).strict();
export const decisionSchema = z.object({ expectedRevision: z.number().int().positive(), reason: z.string().trim().max(2_000).optional() }).strict();
export const documentSchema = z.object({
  versionId: idSchema.optional(),
  format: z.enum(["json", "pdf", "docx"]).default("pdf"),
  locale: z.enum(["hy", "ru", "en"]).default("en"),
}).strict();

export const updateQuoteSettingsSchema = z.object({
  numberPrefix: z.string().trim().regex(/^[A-Z0-9-]{1,12}$/).optional(),
  defaultCurrency: currencySchema.optional(),
  defaultTaxRate: rateSchema.optional(),
  taxIncluded: z.boolean().optional(),
  defaultValidDays: z.number().int().min(1).max(3650).optional(),
  approvalRequired: z.boolean().optional(),
  discountThresholdPct: z.union([rateSchema, z.null()]).optional(),
  valueThreshold: z.union([moneySchema, z.null()]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const productInputSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(240),
  description: nullableText(2_000),
  price: moneySchema,
  currency: currencySchema,
  unit: z.string().trim().min(1).max(40).default("each"),
  active: z.boolean().default(true),
}).strict();

export const productUpdateSchema = productInputSchema.partial().strict().refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type QuoteListQuery = z.infer<typeof quoteListQuerySchema>;
export type UpdateQuoteSettingsInput = z.infer<typeof updateQuoteSettingsSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
