"use client";

import { useMemo, useState, type FormEvent } from "react";
import { FileText, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuoteDto } from "@/lib/quotes/types";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { QuoteFlowDataProvider, useQuoteFlowData } from "./QuoteFlowData";

type Tab = "quotes" | "builder" | "requests" | "catalog" | "approvals" | "analytics" | "settings";
export interface QuoteFlowViewProps { initialTab?: Tab; initialQuoteId?: string }
const TABS: Array<[Tab, string]> = [["quotes", "quoteflow.tab.quotes"], ["builder", "quoteflow.quotes.new"], ["requests", "quoteflow.tab.requests"], ["catalog", "quoteflow.tab.catalog"], ["approvals", "quoteflow.tab.approvals"], ["analytics", "quoteflow.tab.analytics"], ["settings", "quoteflow.tab.settings"]];

function money(value: string, currency: string) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(value))} ${currency}`;
}

function QuoteTable({ quotes, onSelect }: { quotes: QuoteDto[]; onSelect: (quote: QuoteDto) => void }) {
  const { t } = useLocale();
  return <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-sm"><thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="p-3">{t("quoteflow.quotes.number")}</th><th className="p-3">{t("quoteflow.quotes.customer")}</th><th className="p-3">{t("quoteflow.quotes.status")}</th><th className="p-3 text-right">{t("quoteflow.quotes.total")}</th><th className="p-3">{t("quoteflow.quotes.version")}</th></tr></thead>
      <tbody>{quotes.map((quote) => <tr key={quote.id} className="cursor-pointer border-t border-border hover:bg-muted/30" onClick={() => onSelect(quote)}><td className="p-3 font-medium text-cyan">{quote.number}</td><td className="p-3">{quote.customerName}</td><td className="p-3"><span className="rounded-full bg-muted px-2 py-1 text-xs">{t(`quoteflow.status.${quote.status}`)}</span></td><td className="p-3 text-right tabular-nums">{money(quote.total, quote.currency)}</td><td className="p-3">v{quote.currentVersionNumber} · r{quote.revision}</td></tr>)}</tbody>
    </table>{quotes.length === 0 && <p className="p-8 text-center text-muted-foreground">{t("quoteflow.runtime.emptyQuotes")}</p>}
  </div>;
}

function QuoteDetail({ quote, close }: { quote: QuoteDto; close: () => void }) {
  const { t } = useLocale();
  const { action, generateDocument } = useQuoteFlowData();
  const [busy, setBusy] = useState(false);
  const [documentBusy, setDocumentBusy] = useState<"pdf" | "docx" | null>(null);
  const [documentLocale, setDocumentLocale] = useState<"hy" | "ru" | "en">("en");
  const run = async (name: Parameters<typeof action>[1]) => {
    setBusy(true);
    try { await action(quote, name, name === "reject" || name === "decline" ? t("quoteflow.runtime.decisionRecorded") : undefined); toast.success(t("quoteflow.runtime.actionDone")); close(); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("quoteflow.runtime.actionFailed")); }
    finally { setBusy(false); }
  };
  const actions: Partial<Record<QuoteDto["status"], Parameters<typeof action>[1][]>> = {
    draft: ["submit"], pending_approval: ["approve", "reject"], approved: ["send"], sent: ["accept", "decline"],
  };
  const createArtifact = async (format: "pdf" | "docx") => {
    setDocumentBusy(format);
    try {
      const document = await generateDocument(quote, format, documentLocale);
      toast.success(t("quoteflow.runtime.documentReady", { format: format.toUpperCase(), version: quote.currentVersionNumber }));
      window.location.assign(document.downloadPath);
    } catch (error) { toast.error(error instanceof Error ? error.message : t("quoteflow.runtime.documentFailed")); }
    finally { setDocumentBusy(null); }
  };
  return <div className="space-y-5 rounded-xl border border-cyan/30 bg-card p-5">
    <div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{t("quoteflow.runtime.immutableVersion", { version: quote.currentVersionNumber })}</p><h2 className="text-xl font-semibold">{quote.number} · {quote.customerName}</h2></div><Button variant="ghost" onClick={close}>{t("common.close")}</Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{t("quoteflow.builder.subtotal")}</p><p>{money(quote.subtotal, quote.currency)}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{t("quoteflow.builder.tax")}</p><p>{money(quote.tax, quote.currency)}</p></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{t("quoteflow.runtime.authoritativeTotal")}</p><p className="font-semibold">{money(quote.total, quote.currency)}</p></div></div>
    <div>{quote.items.map((item) => <div key={item.id} className="flex justify-between border-b border-border py-2"><span>{item.productName} × {Number(item.quantity)}</span><span>{money(item.total, quote.currency)}</span></div>)}</div>
    <div className="flex flex-wrap gap-2">{(actions[quote.status] ?? []).map((name) => <Button key={name} disabled={busy} onClick={() => void run(name)}>{t(`quoteflow.action.${name}`)}</Button>)}<select aria-label={t("quoteflow.runtime.documentLanguage")} value={documentLocale} onChange={(event) => setDocumentLocale(event.target.value as "hy" | "ru" | "en")} className="rounded-md border border-border bg-background px-3 text-sm"><option value="hy">Հայերեն</option><option value="ru">Русский</option><option value="en">English</option></select><Button variant="outline" disabled={busy || documentBusy !== null} onClick={() => void createArtifact("pdf")}>{documentBusy === "pdf" && <Loader2 className="mr-2 size-4 animate-spin" />}{t("quoteflow.builder.generatePdf")}</Button><Button variant="outline" disabled={busy || documentBusy !== null} onClick={() => void createArtifact("docx")}>{documentBusy === "docx" && <Loader2 className="mr-2 size-4 animate-spin" />}{t("quoteflow.builder.generateDocx")}</Button></div>
  </div>;
}

function QuoteBuilder({ done }: { done: (quote: QuoteDto) => void }) {
  const { t } = useLocale();
  const { overview, createQuote } = useQuoteFlowData();
  const [customerId, setCustomerId] = useState(overview?.customers[0]?.id ?? "");
  const [leadId, setLeadId] = useState(overview?.leads[0]?.id ?? "");
  const [productId, setProductId] = useState(overview?.products.find((product) => product.active)?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const product = overview?.products.find((item) => item.id === productId);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!product) return; setBusy(true);
    try {
      const quote = await createQuote({ customerId: customerId || undefined, leadId: customerId ? undefined : leadId || undefined, currency: product.currency as "AMD" | "USD" | "EUR", quoteDiscountType: "percent", quoteDiscountValue: "0", items: [{ productId, quantity, discountType: "percent", discountValue: "0", unit: product.unit }] });
      toast.success(t("quoteflow.runtime.quoteSaved", { number: quote.number })); done(quote);
    } catch (error) { toast.error(error instanceof Error ? error.message : t("quoteflow.runtime.quoteFailed")); }
    finally { setBusy(false); }
  };
  if (!overview?.products.some((item) => item.active)) return <div className="rounded-xl border border-amber-500/30 p-6">{t("quoteflow.runtime.createProductFirst")}</div>;
  return <form onSubmit={submit} className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-6"><h2 className="text-lg font-semibold">{t("quoteflow.runtime.serverPriced")}</h2>
    <label className="grid gap-1 text-sm">{t("quoteflow.builder.customer")}<select className="rounded-md border border-border bg-background p-2" value={customerId} onChange={(event) => setCustomerId(event.target.value)}><option value="">{t("quoteflow.runtime.useLead")}</option>{overview.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
    {!customerId && <label className="grid gap-1 text-sm">{t("quoteflow.builder.lead")}<select className="rounded-md border border-border bg-background p-2" value={leadId} onChange={(event) => setLeadId(event.target.value)}>{overview.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company || lead.name}</option>)}</select></label>}
    <label className="grid gap-1 text-sm">{t("quoteflow.builder.product")}<select className="rounded-md border border-border bg-background p-2" value={productId} onChange={(event) => setProductId(event.target.value)}>{overview.products.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.price, item.currency)}</option>)}</select></label>
    <label className="grid gap-1 text-sm">{t("quoteflow.runtime.quantity")}<Input required value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" /></label>
    <p className="text-xs text-muted-foreground">{t("quoteflow.runtime.serverPricingHint")}</p><Button disabled={busy || (!customerId && !leadId)} type="submit">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("quoteflow.runtime.createV1")}</Button>
  </form>;
}

function Catalog() {
  const { t } = useLocale();
  const { overview, createProduct } = useQuoteFlowData(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true);
    try { await createProduct({ sku: String(data.get("sku")), name: String(data.get("name")), price: String(data.get("price")), currency: String(data.get("currency")) as "AMD" | "USD" | "EUR", unit: "each", active: true }); setOpen(false); toast.success(t("quoteflow.runtime.productSaved")); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("quoteflow.runtime.productFailed")); } finally { setBusy(false); }
  };
  return <div className="space-y-4"><Button onClick={() => setOpen(!open)}><Plus className="mr-2 h-4 w-4" />{t("quoteflow.catalog.add")}</Button>{open && <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4"><Input name="sku" required placeholder={t("quoteflow.catalog.sku")}/><Input name="name" required placeholder={t("quoteflow.catalog.name")}/><Input name="price" required placeholder="0.00"/><select name="currency" aria-label={t("quoteflow.builder.currency")} className="rounded-md border border-border bg-background px-3"><option>USD</option><option>EUR</option><option>AMD</option></select><Button disabled={busy} type="submit">{t("common.save")}</Button></form>}<div className="grid gap-3 md:grid-cols-2">{overview?.products.map((product) => <div key={product.id} className="rounded-xl border border-border p-4"><div className="flex justify-between"><div><p className="font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku} · {product.unit}</p></div><p>{money(product.price, product.currency)}</p></div></div>)}</div></div>;
}

function Settings() {
  const { t } = useLocale();
  const { overview, updateSettings } = useQuoteFlowData(); const settings = overview!.settings; const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true);
    try { await updateSettings({ numberPrefix: String(data.get("prefix")), defaultCurrency: String(data.get("currency")) as "AMD" | "USD" | "EUR", defaultTaxRate: String(data.get("tax")), defaultValidDays: Number(data.get("days")), approvalRequired: data.get("approval") === "on" }); toast.success(t("quoteflow.runtime.settingsSaved")); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("quoteflow.runtime.settingsFailed")); } finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="grid max-w-xl gap-4 rounded-xl border border-border p-6"><label>{t("quoteflow.runtime.numberPrefix")}<Input name="prefix" defaultValue={settings.numberPrefix}/></label><label>{t("quoteflow.runtime.defaultCurrency")}<select name="currency" defaultValue={settings.defaultCurrency} className="block w-full rounded-md border border-border bg-background p-2"><option>USD</option><option>EUR</option><option>AMD</option></select></label><label>{t("quoteflow.builder.taxRate")}<Input name="tax" defaultValue={settings.defaultTaxRate}/></label><label>{t("quoteflow.runtime.validityDays")}<Input name="days" type="number" defaultValue={settings.defaultValidDays}/></label><label className="flex gap-2"><input name="approval" type="checkbox" defaultChecked={settings.approvalRequired}/> {t("quoteflow.runtime.requireApproval")}</label><Button disabled={busy}>{t("quoteflow.runtime.saveSettings")}</Button></form>;
}

function QuoteFlowContent({ initialTab = "quotes" }: QuoteFlowViewProps) {
  const { t } = useLocale();
  const { overview, loading, error, refresh } = useQuoteFlowData(); const [tab, setTab] = useState<Tab>(initialTab); const [selected, setSelected] = useState<QuoteDto | null>(null);
  const grouped = useMemo(() => overview?.kpis.reduce<Record<string, { count: number; total: number }>>((acc, row) => { acc[row.currency] ??= { count: 0, total: 0 }; acc[row.currency].count += row.count; acc[row.currency].total += Number(row.total); return acc; }, {}) ?? {}, [overview]);
  if (loading) return <div className="grid min-h-72 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-cyan" /></div>;
  if (error || !overview) return <div className="rounded-xl border border-destructive/40 p-6"><p>{error ?? t("quoteflow.runtime.unavailable")}</p><Button className="mt-4" onClick={() => void refresh()}>{t("common.retry")}</Button></div>;
  return <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-6"><header className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan/10 text-cyan"><FileText/></span><div><h1 className="text-2xl font-semibold">QuoteFlow</h1><p className="text-sm text-muted-foreground">{t("quoteflow.runtime.subtitle")}</p></div></div><Button variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4"/>{t("common.refresh")}</Button></header>
    <nav className="flex flex-wrap gap-1 rounded-xl bg-card p-1 ring-1 ring-border">{TABS.map(([id, label]) => <button key={id} onClick={() => { setTab(id); setSelected(null); }} className={cn("rounded-lg px-3 py-2 text-sm", tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{t(label)}</button>)}</nav>
    {selected ? <QuoteDetail quote={selected} close={() => setSelected(null)}/> : tab === "quotes" ? <QuoteTable quotes={overview.quotes} onSelect={setSelected}/> : tab === "builder" ? <QuoteBuilder done={(quote) => { setSelected(quote); setTab("quotes"); }}/> : tab === "requests" ? <div className="grid gap-3 md:grid-cols-2">{overview.leads.map((lead) => <button key={lead.id} onClick={() => setTab("builder")} className="rounded-xl border border-border p-4 text-left"><p className="font-medium">{lead.company || lead.name}</p><p className="text-sm text-muted-foreground">{lead.email || t("quoteflow.runtime.noEmail")} · {money(lead.value, lead.currency)}</p></button>)}</div> : tab === "catalog" ? <Catalog/> : tab === "approvals" ? <div className="space-y-3">{overview.pendingApprovals.map((approval) => { const quote = overview.quotes.find((item) => item.id === approval.quoteId); return quote ? <button key={approval.id} onClick={() => setSelected(quote)} className="flex w-full justify-between rounded-xl border border-amber-500/30 p-4 text-left"><span><ShieldCheck className="mr-2 inline h-4 w-4"/>{quote.number} · {quote.customerName}</span><span>v{approval.version.versionNumber} · {money(approval.version.total, approval.version.currency)}</span></button> : null; })}{overview.pendingApprovals.length === 0 && <p className="rounded-xl border border-border p-8 text-center text-muted-foreground">{t("quoteflow.runtime.noApprovals")}</p>}</div> : tab === "analytics" ? <div className="grid gap-4 sm:grid-cols-3">{Object.entries(grouped).map(([currency, value]) => <div key={currency} className="rounded-xl border border-border p-5"><p className="text-sm text-muted-foreground">{t("quoteflow.runtime.currencyPipeline", { currency })}</p><p className="mt-2 text-2xl font-semibold">{money(String(value.total), currency)}</p><p className="text-xs text-muted-foreground">{t("quoteflow.runtime.quoteCount", { count: value.count })}</p></div>)}</div> : <Settings/>}
  </div>;
}

export function QuoteFlowView(props: QuoteFlowViewProps) { const { session } = useAuth(); return <QuoteFlowDataProvider key={session.activeOrganization.id}><QuoteFlowContent {...props}/></QuoteFlowDataProvider>; }
export default QuoteFlowView;
