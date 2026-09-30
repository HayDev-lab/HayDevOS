import type { CreateQuoteInput, ProductInput, UpdateQuoteSettingsInput } from "@/lib/quotes/schemas";
import type { QuoteDto } from "@/lib/quotes/types";
import type { DocumentFormat, DocumentLocale, GeneratedDocumentDto } from "@/lib/documents/types";
import { fetchWithSession } from "@/lib/auth/client-session";

export interface QuoteFlowOverview {
  quotes: QuoteDto[];
  products: Array<{ id: string; sku: string; name: string; description: string | null; price: string; currency: string; unit: string; active: boolean }>;
  customers: Array<{ id: string; name: string; email: string | null }>;
  leads: Array<{ id: string; name: string; company: string | null; email: string | null; value: string; currency: string }>;
  members: Array<{ id: string; name: string | null; email: string; role: string }>;
  pendingApprovals: Array<{ id: string; quoteId: string; quoteVersionId: string; status: string; requestReason: string | null; requestedAt: string; version: { versionNumber: number; total: string; currency: string } }>;
  settings: { numberPrefix: string; defaultCurrency: "AMD" | "USD" | "EUR"; defaultTaxRate: string; taxIncluded: boolean; defaultValidDays: number; approvalRequired: boolean; discountThresholdPct: string | null; valueThreshold: string | null; documentTemplateVersion: string };
  kpis: Array<{ currency: string; status: string; count: number; total: string }>;
}

type ApiFailure = { error?: { message?: string; code?: string; details?: unknown } };

export async function quoteRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithSession(url, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    let failure: ApiFailure = {};
    try { failure = await response.json() as ApiFailure; } catch { /* use HTTP fallback */ }
    const error = new Error(failure.error?.message ?? `Request failed (${response.status})`);
    error.name = failure.error?.code ?? "QUOTEFLOW_REQUEST_FAILED";
    throw error;
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const fetchQuoteOverview = () => quoteRequest<QuoteFlowOverview>("/api/quoteflow/overview");
export const createQuoteRequest = async (input: CreateQuoteInput) => (await quoteRequest<{ quote: QuoteDto }>("/api/quoteflow/quotes", { method: "POST", body: JSON.stringify(input) })).quote;
export const quoteActionRequest = async (quote: QuoteDto, action: "submit" | "approve" | "reject" | "send" | "accept" | "decline", reason?: string) =>
  (await quoteRequest<{ quote: QuoteDto }>(`/api/quoteflow/quotes/${encodeURIComponent(quote.id)}/${action}`, { method: "POST", body: JSON.stringify({ expectedRevision: quote.revision, ...(reason ? { reason } : {}) }) })).quote;
export const createProductRequest = async (input: ProductInput) => quoteRequest("/api/quoteflow/products", { method: "POST", body: JSON.stringify(input) });
export const updateQuoteSettingsRequest = async (input: UpdateQuoteSettingsInput) => quoteRequest("/api/quoteflow/settings", { method: "PATCH", body: JSON.stringify(input) });
export const generateDocumentRequest = async (quoteId: string, versionId: string | undefined, format: DocumentFormat, locale: DocumentLocale) =>
  quoteRequest<{ document: GeneratedDocumentDto }>(`/api/quoteflow/quotes/${encodeURIComponent(quoteId)}/document`, {
    method: "POST",
    body: JSON.stringify({ format, locale, ...(versionId ? { versionId } : {}) }),
  });
