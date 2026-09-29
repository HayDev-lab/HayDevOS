import type { DomainContext } from "@/lib/leads/types";

export type { DomainContext };

export const PRODUCT_TYPES = ["STOCKED_PRODUCT", "NON_STOCKED_PRODUCT", "SERVICE"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const ORDER_STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "PROCESSING",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderPaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERPAID";

export interface MoneyByCurrency {
  currency: string;
  amount: string;
}

export interface CustomerDto {
  id: string;
  sourceLeadId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  type: "individual" | "business";
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  type: ProductType;
  price: string;
  cost: string;
  currency: string;
  unit: string;
  lowStockThreshold: string | null;
  active: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemDto {
  id: string;
  productId: string | null;
  productType: ProductType;
  sku: string | null;
  name: string;
  description: string | null;
  unit: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  tax: string;
  lineTotal: string;
  currency: string;
  position: number;
}

export interface PaymentSummaryDto {
  status: OrderPaymentStatus;
  received: string;
  refunded: string;
  netReceived: string;
  outstanding: string;
  unmatchedCurrencies: MoneyByCurrency[];
}

export interface OrderDto {
  id: string;
  number: string;
  customerId: string;
  customerSnapshot: Record<string, unknown>;
  sourceQuoteId: string | null;
  sourceQuoteVersionId: string | null;
  status: OrderStatus;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  total: string;
  revision: number;
  confirmedAt: string | null;
  fulfilledAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDto[];
  payments: PaymentSummaryDto;
  fulfillmentCount: number;
  documentCount: number;
}

export interface InventoryBalanceDto {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  onHand: string;
  reserved: string;
  available: string;
  lowStockThreshold: string | null;
  lowStock: boolean;
  revision: number;
  updatedAt: string;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}
