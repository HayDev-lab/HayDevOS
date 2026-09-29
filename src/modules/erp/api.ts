import type { CustomerDto, InventoryBalanceDto, OrderDto, PageResult, ProductDto } from "@/lib/erp/types";

type ApiFailure = { error?: { code?: string; message?: string; details?: unknown } };

export class ErpRequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super(message); this.name = "ErpRequestError";
  }
}

export async function erpRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  if (!response.ok) {
    let failure: ApiFailure = {};
    try { failure = await response.json() as ApiFailure; } catch { /* HTTP fallback */ }
    throw new ErpRequestError(response.status, failure.error?.code ?? "ERP_REQUEST_FAILED", failure.error?.message ?? `Request failed (${response.status})`, failure.error?.details);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export interface ErpOverview {
  orderStatus: Record<string, number>;
  ordersByCurrency: Array<{ currency: string; count: number; total: string }>;
  paymentsByCurrency: Array<{ currency: string; received: string; refunded: string; net: string }>;
  inventory: { balanceCount: number; outOfStock: number; lowStock: number; reservedLines: number };
  recentOrders: Array<{ id: string; number: string; status: string; currency: string; total: string; revision: number; createdAt: string }>;
  note: string;
}

export interface WarehouseDto { id: string; code: string; name: string; active: boolean }
export interface PaymentDto { id: string; orderId: string | null; type: string; status: string; amount: string; currency: string; method: string; reference: string | null; paidAt: string }

export async function fetchErpData() {
  const [overview, orders, products, customers, inventory, payments, warehouseResult] = await Promise.all([
    erpRequest<ErpOverview>("/api/erp/overview"), erpRequest<PageResult<OrderDto>>("/api/erp/orders?limit=50"),
    erpRequest<PageResult<ProductDto>>("/api/erp/products?limit=100"), erpRequest<PageResult<CustomerDto>>("/api/erp/customers?limit=100"),
    erpRequest<PageResult<InventoryBalanceDto>>("/api/erp/inventory?limit=100"), erpRequest<PageResult<PaymentDto>>("/api/erp/payments?limit=100"),
    erpRequest<{ warehouses: WarehouseDto[] }>("/api/erp/warehouses"),
  ]);
  return { overview, orders: orders.items, products: products.items, customers: customers.items, inventory: inventory.items, payments: payments.items, warehouses: warehouseResult.warehouses };
}

export const mutateErp = <T>(url: string, body: unknown, idempotent = false) => erpRequest<T>(url, {
  method: "POST", body: JSON.stringify(body), ...(idempotent ? { headers: { "Idempotency-Key": crypto.randomUUID() } } : {}),
});
