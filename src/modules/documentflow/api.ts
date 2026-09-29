import type { DocumentDto } from "@/lib/documents/types";

type ApiFailure = { error?: { message?: string; code?: string } };

async function documentRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    let failure: ApiFailure = {};
    try { failure = await response.json() as ApiFailure; } catch { /* HTTP fallback */ }
    const error = new Error(failure.error?.message ?? `Request failed (${response.status})`);
    error.name = failure.error?.code ?? "DOCUMENT_REQUEST_FAILED";
    throw error;
  }
  return response.json() as Promise<T>;
}

export interface DocumentPage {
  items: DocumentDto[];
  page: number;
  pageSize: number;
  total: number;
}

export const fetchDocuments = (search = "") =>
  documentRequest<DocumentPage>(`/api/documents?page=1&pageSize=100${search ? `&search=${encodeURIComponent(search)}` : ""}`);

export async function uploadDocumentFile(file: File, title?: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("metadata", JSON.stringify({ ...(title ? { title } : {}) }));
  return (await documentRequest<{ document: DocumentDto }>("/api/documents/upload", { method: "POST", body: form })).document;
}

export async function archiveDocumentRequest(documentId: string) {
  return (await documentRequest<{ document: DocumentDto }>(`/api/documents/${encodeURIComponent(documentId)}/archive`, { method: "POST" })).document;
}
