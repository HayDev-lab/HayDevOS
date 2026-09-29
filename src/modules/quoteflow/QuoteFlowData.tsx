"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CreateQuoteInput, ProductInput, UpdateQuoteSettingsInput } from "@/lib/quotes/schemas";
import type { QuoteDto } from "@/lib/quotes/types";
import type { DocumentFormat, DocumentLocale, GeneratedDocumentDto } from "@/lib/documents/types";
import { createProductRequest, createQuoteRequest, fetchQuoteOverview, generateDocumentRequest, quoteActionRequest, updateQuoteSettingsRequest, type QuoteFlowOverview } from "./api";

interface QuoteFlowDataValue {
  overview: QuoteFlowOverview | null; loading: boolean; error: string | null; refresh: () => Promise<void>;
  createQuote: (input: CreateQuoteInput) => Promise<QuoteDto>;
  action: (quote: QuoteDto, action: "submit" | "approve" | "reject" | "send" | "accept" | "decline", reason?: string) => Promise<QuoteDto>;
  createProduct: (input: ProductInput) => Promise<void>;
  updateSettings: (input: UpdateQuoteSettingsInput) => Promise<void>;
  generateDocument: (quote: QuoteDto, format: DocumentFormat, locale: DocumentLocale) => Promise<GeneratedDocumentDto>;
}

const Context = createContext<QuoteFlowDataValue | null>(null);

export function QuoteFlowDataProvider({ children }: { children: ReactNode }) {
  const [overview, setOverview] = useState<QuoteFlowOverview | null>(null);
  const current = useRef<QuoteFlowOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!current.current) setLoading(true);
    try { const next = await fetchQuoteOverview(); current.current = next; setOverview(next); setError(null); }
    catch (cause) { current.current = null; setOverview(null); setError(cause instanceof Error ? cause.message : "QuoteFlow data could not be loaded"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    void fetchQuoteOverview().then((next) => {
      if (cancelled) return;
      current.current = next;
      setOverview(next);
      setError(null);
    }).catch((cause) => {
      if (cancelled) return;
      current.current = null;
      setOverview(null);
      setError(cause instanceof Error ? cause.message : "QuoteFlow data could not be loaded");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  const createQuote = useCallback(async (input: CreateQuoteInput) => { const quote = await createQuoteRequest(input); await refresh(); return quote; }, [refresh]);
  const action = useCallback(async (quote: QuoteDto, name: Parameters<typeof quoteActionRequest>[1], reason?: string) => { const next = await quoteActionRequest(quote, name, reason); await refresh(); return next; }, [refresh]);
  const createProduct = useCallback(async (input: ProductInput) => { await createProductRequest(input); await refresh(); }, [refresh]);
  const updateSettings = useCallback(async (input: UpdateQuoteSettingsInput) => { await updateQuoteSettingsRequest(input); await refresh(); }, [refresh]);
  const generateDocument = useCallback(async (quote: QuoteDto, format: DocumentFormat, locale: DocumentLocale) =>
    (await generateDocumentRequest(quote.id, quote.currentVersionId ?? undefined, format, locale)).document, []);
  const value = useMemo(() => ({ overview, loading, error, refresh, createQuote, action, createProduct, updateSettings, generateDocument }), [overview, loading, error, refresh, createQuote, action, createProduct, updateSettings, generateDocument]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useQuoteFlowData() { const value = useContext(Context); if (!value) throw new Error("useQuoteFlowData must be used inside QuoteFlowDataProvider"); return value; }
