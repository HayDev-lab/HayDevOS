"use client";

import Link from "next/link";
import { workspaceHref } from "@/lib/workspace-routes";

import { useWorkspaceSection } from "@/lib/workspace-navigation";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, Boxes, CreditCard, LayoutDashboard, Loader2, PackageCheck, RefreshCw, ShoppingBag, Users, Warehouse } from "lucide-react";

import { useAuth } from "@/components/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OrderDto } from "@/lib/erp/types";
import { t as translateText, useLocale } from "@/lib/i18n";
import { localizeError } from "@/lib/i18n-errors";
import { cn } from "@/lib/utils";
import { ErpRequestError, fetchErpData, mutateErp } from "./api";

type Data = Awaited<ReturnType<typeof fetchErpData>>;
type Tab = "overview" | "orders" | "catalog" | "inventory" | "payments" | "customers";
const tabs: Array<[Tab, string, typeof LayoutDashboard]> = [
  ["overview", "erp.tab.dashboard", LayoutDashboard], ["orders", "erp.tab.orders", ShoppingBag], ["catalog", "erp.tab.products", Boxes],
  ["inventory", "erp.tab.inventory", Warehouse], ["payments", "erp.tab.payments", CreditCard], ["customers", "erp.tab.customers", Users],
];

function amount(value: string, currency: string, locale: string) { return `${currency} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(Number(value))}`; }
function Empty({ children }: { children: ReactNode }) { return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{children}</div>; }
function ErrorState({ error, retry }: { error: Error; retry: () => void }) {
  const { t } = useLocale();
  const request = error instanceof ErpRequestError ? error : null;
  return <Card className="border-destructive/40"><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-destructive"/>{t("erp.runtime.unavailable")}</CardTitle><CardDescription>{localizeError(error)}</CardDescription></CardHeader><CardContent className="flex items-center gap-3"><Badge variant="outline">{request?.status === 403 ? t("erp.runtime.permissionDenied") : request?.code ?? t("erp.runtime.networkError")}</Badge><Button variant="outline" onClick={retry}><RefreshCw/>{t("common.retry")}</Button></CardContent></Card>;
}

function Overview({ data }: { data: Data }) {
  const { t, locale } = useLocale();
  const open = Object.entries(data.overview.orderStatus).filter(([status]) => !["COMPLETED", "CANCELLED"].includes(status)).reduce((sum, [, count]) => sum + count, 0);
  const cards = [["erp.kpi.ordersOpen", open, ShoppingBag], ["erp.runtime.stockBalances", data.overview.inventory.balanceCount, Boxes], ["erp.kpi.lowStock", data.overview.inventory.lowStock, AlertTriangle], ["erp.runtime.reservedLines", data.overview.inventory.reservedLines, PackageCheck]] as const;
  return <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <Card key={label}><CardHeader className="pb-2"><CardDescription>{t(label)}</CardDescription><CardTitle className="flex items-center justify-between text-3xl">{value}<Icon className="size-5 text-cyan"/></CardTitle></CardHeader></Card>)}</div><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>{t("erp.runtime.ordersByCurrency")}</CardTitle><CardDescription>{t("erp.runtime.noFx")}</CardDescription></CardHeader><CardContent className="space-y-3">{data.overview.ordersByCurrency.map((row) => <div key={row.currency} className="flex justify-between border-b border-border pb-2"><span>{t("erp.runtime.orderCount", { currency: row.currency, count: row.count })}</span><strong>{amount(row.total, row.currency, locale)}</strong></div>)}{!data.overview.ordersByCurrency.length && <Empty>{t("erp.runtime.noOrdersYet")}</Empty>}</CardContent></Card><Card><CardHeader><CardTitle>{t("erp.runtime.cashEvents")}</CardTitle><CardDescription>{t("erp.runtime.refundsAppendOnly")}</CardDescription></CardHeader><CardContent className="space-y-3">{data.overview.paymentsByCurrency.map((row) => <div key={row.currency} className="flex justify-between border-b border-border pb-2"><span>{t("erp.runtime.cashSummary", { currency: row.currency, received: row.received, refunded: row.refunded })}</span><strong>{amount(row.net, row.currency, locale)}</strong></div>)}{!data.overview.paymentsByCurrency.length && <Empty>{t("erp.runtime.noConfirmedPayments")}</Empty>}</CardContent></Card></div></div>;
}

function OrderActions({ order, data, run }: { order: OrderDto; data: Data; run: (path: string, body: unknown, idempotent?: boolean) => Promise<void> }) {
  const { t } = useLocale();
  const [warehouseId, setWarehouseId] = useState(data.warehouses[0]?.id ?? ""); const [amountValue, setAmountValue] = useState(""); const [busy, setBusy] = useState(false);
  const execute = async (path: string, body: unknown, idempotent = false) => { setBusy(true); try { await run(path, body, idempotent); } finally { setBusy(false); } };
  return <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
    {order.status === "DRAFT" && <><select aria-label={t("erp.runtime.reservationWarehouse")} value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm"><option value="">{t("erp.runtime.warehouse")}</option>{data.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code}</option>)}</select><Button size="sm" disabled={busy} onClick={() => void execute(`/api/erp/orders/${order.id}/confirm`, { expectedRevision: order.revision, ...(warehouseId ? { warehouseId } : {}) })}>{t("common.confirm")}</Button></>}
    {["DRAFT", "CONFIRMED", "PROCESSING"].includes(order.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => void execute(`/api/erp/orders/${order.id}/cancel`, { expectedRevision: order.revision, reason: t("erp.runtime.cancelReason") })}>{t("common.cancel")}</Button>}
    {order.status === "FULFILLED" && <Button size="sm" disabled={busy} onClick={() => void execute(`/api/erp/orders/${order.id}/complete`, { expectedRevision: order.revision })}>{t("erp.runtime.complete")}</Button>}
    <Input aria-label={t("erp.payment.amount")} value={amountValue} onChange={(event) => setAmountValue(event.target.value)} placeholder={t("erp.runtime.paymentCurrency", { currency: order.currency })} className="w-36"/><Button size="sm" variant="outline" disabled={busy || !amountValue} onClick={() => void execute("/api/erp/payments", { orderId: order.id, amount: amountValue, currency: order.currency, method: "bank" }, true)}>{t("erp.payment.record")}</Button>
  </div>;
}

function Orders({ data, run }: { data: Data; run: (path: string, body: unknown, idempotent?: boolean) => Promise<void> }) {
  const { t, locale } = useLocale();
  const [quoteId, setQuoteId] = useState("");
  return <div className="space-y-4"><Card><CardHeader><CardTitle>{t("erp.runtime.createFromQuote")}</CardTitle><CardDescription>{t("erp.runtime.quoteCopyHint")}</CardDescription></CardHeader><CardContent><form className="flex max-w-xl gap-2" onSubmit={(event) => { event.preventDefault(); void run("/api/erp/orders", { quoteId }, true).then(() => setQuoteId("")); }}><Input required value={quoteId} onChange={(event) => setQuoteId(event.target.value)} placeholder={t("erp.runtime.acceptedQuoteId")}/><Button type="submit">{t("erp.order.create")}</Button></form></CardContent></Card>{data.orders.map((order) => <Card key={order.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-2"><div><CardTitle>{order.number}</CardTitle><CardDescription>r{order.revision} · {String(order.customerSnapshot.name ?? order.customerId)}</CardDescription></div><div className="text-right"><Badge>{t(`erp.runtime.orderStatus.${order.status.toLowerCase()}`)}</Badge><p className="mt-2 font-semibold">{amount(order.total, order.currency, locale)}</p><p className="text-xs text-muted-foreground">{t(`erp.runtime.paymentStatus.${order.payments.status.toLowerCase()}`)} · {t("erp.runtime.outstanding", { amount: order.payments.outstanding })}</p></div></div></CardHeader><CardContent><div className="space-y-1 text-sm">{order.items.map((item) => <div key={item.id} className="flex justify-between"><span>{item.name} × {Number(item.quantity)}</span><span>{amount(item.lineTotal, item.currency, locale)}</span></div>)}</div><OrderActions order={order} data={data} run={run}/></CardContent></Card>)}{!data.orders.length && <Empty>{t("erp.runtime.noOrders")}</Empty>}</div>;
}

function Catalog({ data, run }: { data: Data; run: (path: string, body: unknown, idempotent?: boolean) => Promise<void> }) {
  const { t, locale } = useLocale();
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const target = event.currentTarget; const form = new FormData(target); void run("/api/erp/products", { sku: form.get("sku"), name: form.get("name"), type: form.get("type"), price: form.get("price"), cost: form.get("cost"), currency: form.get("currency"), unit: form.get("unit"), active: true }).then(() => target.reset()); };
  return <div className="space-y-4"><Card><CardHeader><CardTitle>{t("erp.runtime.canonicalProduct")}</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-2 md:grid-cols-4"><Input name="sku" required placeholder={t("erp.product.sku")}/><Input name="name" required placeholder={t("erp.product.name")}/><select name="type" aria-label={t("erp.runtime.productType")} className="rounded-md border border-border bg-background px-3"><option value="STOCKED_PRODUCT">{t("erp.runtime.stockedProduct")}</option><option value="NON_STOCKED_PRODUCT">{t("erp.runtime.nonStockedProduct")}</option><option value="SERVICE">{t("erp.runtime.service")}</option></select><Input name="price" required placeholder={t("erp.product.price")}/><Input name="cost" aria-label={t("erp.product.cost")} required defaultValue="0"/><Input name="currency" aria-label={t("erp.settings.currency")} required defaultValue="USD"/><Input name="unit" aria-label={t("erp.runtime.unit")} required defaultValue="each"/><Button type="submit">{t("erp.runtime.saveProduct")}</Button></form></CardContent></Card><div className="grid gap-3 md:grid-cols-2">{data.products.map((product) => <Card key={product.id}><CardHeader><CardTitle>{product.name}</CardTitle><CardDescription>{product.sku} · {t(`erp.runtime.productType.${product.type.toLowerCase()}`)}</CardDescription></CardHeader><CardContent className="flex justify-between"><span>{product.unit}</span><strong>{amount(product.price, product.currency, locale)}</strong></CardContent></Card>)}</div>{!data.products.length && <Empty>{t("erp.runtime.noProducts")}</Empty>}</div>;
}

function Inventory({ data, run }: { data: Data; run: (path: string, body: unknown, idempotent?: boolean) => Promise<void> }) {
  const { t } = useLocale();
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const target = event.currentTarget; const form = new FormData(target); void run("/api/erp/inventory/receive", { warehouseId: form.get("warehouseId"), productId: form.get("productId"), quantity: form.get("quantity"), reason: form.get("reason") }, true).then(() => target.reset()); };
  const warehouseSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const target = event.currentTarget; const form = new FormData(target); void run("/api/erp/warehouses", { code: form.get("code"), name: form.get("name") }).then(() => target.reset()); };
  return <div className="space-y-4"><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>{t("erp.runtime.warehouse")}</CardTitle></CardHeader><CardContent><form onSubmit={warehouseSubmit} className="flex gap-2"><Input required name="code" placeholder={t("erp.settings.seqPrefix")}/><Input required name="name" placeholder={t("erp.product.name")}/><Button type="submit">{t("erp.settings.add")}</Button></form></CardContent></Card><Card><CardHeader><CardTitle>{t("erp.runtime.receiveStock")}</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-2 sm:grid-cols-2"><select required name="warehouseId" aria-label={t("erp.runtime.warehouse")} className="rounded-md border border-border bg-background px-3"><option value="">{t("erp.runtime.warehouse")}</option>{data.warehouses.map((row) => <option key={row.id} value={row.id}>{row.code}</option>)}</select><select required name="productId" aria-label={t("erp.order.product")} className="rounded-md border border-border bg-background px-3"><option value="">{t("erp.runtime.stockedProduct")}</option>{data.products.filter((row) => row.type === "STOCKED_PRODUCT").map((row) => <option key={row.id} value={row.id}>{row.sku} · {row.name}</option>)}</select><Input name="quantity" required placeholder={t("erp.inventory.adjust.qty")}/><Input name="reason" required placeholder={t("erp.inventory.adjust.reason")}/><Button type="submit">{t("erp.runtime.receive")}</Button></form></CardContent></Card></div><div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><thead className="bg-muted/40 text-left"><tr><th className="p-3">{t("erp.runtime.warehouse")}</th><th>{t("erp.order.product")}</th><th>{t("erp.inventory.onHand")}</th><th>{t("erp.inventory.reserved")}</th><th>{t("erp.inventory.available")}</th></tr></thead><tbody>{data.inventory.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3">{row.warehouseCode}</td><td>{row.sku} · {row.productName}</td><td>{row.onHand}</td><td>{row.reserved}</td><td className={cn(row.lowStock && "text-amber")}>{row.available}</td></tr>)}</tbody></table></div>{!data.inventory.length && <Empty>{t("erp.runtime.noInventory")}</Empty>}</div>;
}

function Payments({ data, run }: { data: Data; run: (path: string, body: unknown, idempotent?: boolean) => Promise<void> }) {
  const { t, locale } = useLocale();
  return <div className="space-y-3">{data.payments.map((payment) => <Card key={payment.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6"><div><p className="font-medium">{t(`erp.runtime.paymentType.${payment.type.toLowerCase()}`)} · {amount(payment.amount, payment.currency, locale)}</p><p className="text-xs text-muted-foreground">{t(`erp.runtime.paymentMethod.${payment.method.toLowerCase()}`)} · {payment.reference || t("erp.runtime.noReference")}</p></div><div className="flex gap-2"><Badge variant="outline">{t(`erp.runtime.paymentStatus.${payment.status.toLowerCase()}`)}</Badge>{payment.status === "PENDING" && <><Button size="sm" onClick={() => void run(`/api/erp/payments/${payment.id}/confirm`, {}, true)}>{t("common.confirm")}</Button><Button size="sm" variant="outline" onClick={() => void run(`/api/erp/payments/${payment.id}/void`, { reason: t("erp.runtime.voidReason") }, true)}>{t("erp.runtime.void")}</Button></>}</div></CardContent></Card>)}{!data.payments.length && <Empty>{t("erp.runtime.noPayments")}</Empty>}</div>;
}

function Customers({ data }: { data: Data }) { const { t } = useLocale(); return <div className="grid gap-3 md:grid-cols-2">{data.customers.map((customer) => <Card key={customer.id}><CardHeader><CardTitle>{customer.name}</CardTitle><CardDescription>{t(`erp.runtime.customerType.${customer.type.toLowerCase()}`)} · {customer.email || t("erp.runtime.noEmail")}</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">{customer.address || t("erp.runtime.noAddress")}{customer.taxId ? ` · ${t("erp.runtime.taxId", { id: customer.taxId })}` : ""}</CardContent></Card>)}{!data.customers.length && <Empty>{t("erp.runtime.noCustomers")}</Empty>}</div>; }

function ErpWorkspace() {
  const { locale } = useLocale();
  const t = useCallback((key: string, params?: Record<string, string | number>) => translateText(key, locale, params), [locale]);
  const [tab] = useWorkspaceSection<Tab>("erphub", "overview"); const [data, setData] = useState<Data | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<Error | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const refresh = useCallback(async () => { setLoading(true); try { setData(await fetchErpData()); setError(null); } catch (cause) { setData(null); setError(cause instanceof Error ? cause : new Error(t("erp.runtime.loadFailed"))); } finally { setLoading(false); } }, [t]);
  useEffect(() => {
    let active = true;
    void fetchErpData()
      .then((value) => {
        if (!active) return;
        setData(value);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setData(null);
        setError(cause instanceof Error ? cause : new Error(t("erp.runtime.loadFailed")));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [t]);
  const run = useCallback(async (path: string, body: unknown, idempotent = false) => { try { await mutateErp(path, body, idempotent); setNotice(t("erp.runtime.operationSaved")); await refresh(); } catch (cause) { const issue = cause instanceof Error ? cause : new Error(t("erp.runtime.operationFailed")); setNotice(issue instanceof ErpRequestError && issue.status === 409 ? t("erp.runtime.conflict", { message: issue.message }) : issue instanceof ErpRequestError && issue.status === 403 ? t("erp.runtime.denied", { message: issue.message }) : issue.message); } }, [refresh, t]);
  if (loading && !data) return <div className="flex min-h-[420px] items-center justify-center text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin"/>{t("erp.runtime.loading")}</div>;
  if (error || !data) return <ErrorState error={error ?? new Error(t("erp.runtime.unavailable"))} retry={() => void refresh()}/>;
  return <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-semibold">ERP Hub</h1><p className="text-sm text-muted-foreground">{t("erp.runtime.subtitle")}</p></div><Button variant="outline" disabled={loading} onClick={() => void refresh()}>{loading ? <Loader2 className="animate-spin"/> : <RefreshCw/>}{t("common.refresh")}</Button></div>{notice && <button type="button" onClick={() => setNotice(null)} className="w-full rounded-lg border border-cyan/30 bg-cyan/5 p-3 text-left text-sm">{notice}</button>}<nav className="flex flex-wrap gap-1 rounded-xl bg-card p-1 ring-1 ring-border">{tabs.map(([id, label, Icon]) => <Link href={workspaceHref("erphub", id)} aria-current={tab === id ? "page" : undefined} key={id} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-sm", tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><Icon className="size-4"/>{t(label)}</Link>)}</nav>{tab === "overview" ? <Overview data={data}/> : tab === "orders" ? <Orders data={data} run={run}/> : tab === "catalog" ? <Catalog data={data} run={run}/> : tab === "inventory" ? <Inventory data={data} run={run}/> : tab === "payments" ? <Payments data={data} run={run}/> : <Customers data={data}/>}</div>;
}

export function ErpCrmView() { const { session } = useAuth(); return <div key={session.activeOrganization.id}><ErpWorkspace/></div>; }
export default ErpCrmView;
