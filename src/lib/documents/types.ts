import type { DomainContext } from "@/lib/leads/types";

export type { DomainContext };

export const DOCUMENT_FORMATS = ["pdf", "docx", "json"] as const;
export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number];
export const DOCUMENT_LOCALES = ["hy", "ru", "en"] as const;
export type DocumentLocale = (typeof DOCUMENT_LOCALES)[number];

export interface DocumentVersionDto {
  id: string;
  versionNumber: number;
  status: string;
  scanStatus: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  templateVersion: string | null;
  locale: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
}

export interface DocumentDto {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  scanStatus: string | null;
  documentType: string;
  sourceType: string;
  sourceId: string | null;
  classification: string | null;
  currentVersionNumber: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: { id: string; name: string | null } | null;
  currentVersion: DocumentVersionDto | null;
  versions?: DocumentVersionDto[];
}

export interface QuoteDocumentModel {
  schemaVersion: "quote-document-v1";
  locale: DocumentLocale;
  quoteId: string;
  quoteVersionId: string;
  quoteNumber: string;
  versionNumber: number;
  quoteStatus: string;
  createdAt: string;
  validUntil: string | null;
  template: { key: "quote"; version: string };
  customer: {
    id: string | null;
    name: string;
    email: string | null;
    address: string | null;
    taxId: string | null;
  };
  items: Array<{
    position: number;
    name: string;
    description: string | null;
    unit: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    tax: string;
    subtotal: string;
    total: string;
  }>;
  currency: string;
  subtotal: string;
  lineDiscount: string;
  quoteDiscount: string;
  tax: string;
  total: string;
  terms: string | null;
  notes: string | null;
}

export interface GeneratedDocumentDto {
  id: string;
  documentId: string;
  documentVersionId: string;
  quoteId: string;
  quoteVersionId: string;
  format: DocumentFormat;
  locale: DocumentLocale;
  templateVersion: string;
  contentHash: string;
  sizeBytes: number;
  filename: string;
  generatedAt: string;
  downloadPath: string;
  snapshot: QuoteDocumentModel;
}
