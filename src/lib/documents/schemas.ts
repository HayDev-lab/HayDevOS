import { z } from "zod";

import { DOCUMENT_FORMATS, DOCUMENT_LOCALES } from "./types";

const id = z.string().trim().min(1).max(128);

export const documentListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().max(40).optional(),
  type: z.string().trim().max(40).optional(),
  sourceType: z.string().trim().max(40).optional(),
  mimeType: z.string().trim().max(200).optional(),
  includeArchived: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
}).strict();

export const uploadMetadataSchema = z.object({
  documentId: id.optional(),
  title: z.string().trim().min(1).max(240).optional(),
}).strict();

export const generateDocumentSchema = z.object({
  versionId: id.optional(),
  format: z.enum(DOCUMENT_FORMATS).default("pdf"),
  locale: z.enum(DOCUMENT_LOCALES).default("en"),
}).strict();

export const versionQuerySchema = z.object({ versionId: id.optional() }).strict();
