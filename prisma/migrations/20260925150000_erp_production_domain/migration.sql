-- Gate #6: authoritative operational ERP domain. This migration preserves
-- existing Customer/Product/Order/Invoice/Payment rows and adds transactional
-- order, inventory, fulfillment, and finance ledgers.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public."Order" o
    JOIN public."Customer" c ON c."id" = o."customerId"
    WHERE c."orgId" <> o."orgId"
  ) THEN RAISE EXCEPTION 'Cross-tenant Order/Customer rows must be reconciled before Gate 6'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."Invoice" i
    JOIN public."Customer" c ON c."id" = i."customerId"
    WHERE c."orgId" <> i."orgId"
  ) THEN RAISE EXCEPTION 'Cross-tenant Invoice/Customer rows must be reconciled before Gate 6'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."Invoice" i
    JOIN public."Order" o ON o."id" = i."orderId"
    WHERE i."orderId" IS NOT NULL AND o."orgId" <> i."orgId"
  ) THEN RAISE EXCEPTION 'Cross-tenant Invoice/Order rows must be reconciled before Gate 6'; END IF;
  IF EXISTS (
    SELECT 1 FROM public."Payment" p
    JOIN public."Invoice" i ON i."id" = p."invoiceId"
    WHERE i."orgId" <> p."orgId"
  ) THEN RAISE EXCEPTION 'Cross-tenant Payment/Invoice rows must be reconciled before Gate 6'; END IF;
END;
$$;

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropIndex
DROP INDEX "Customer_orgId_idx";

-- DropIndex
DROP INDEX "Invoice_customerId_idx";

-- DropIndex
DROP INDEX "Invoice_orderId_key";

-- DropIndex
DROP INDEX "Invoice_orgId_status_idx";

-- DropIndex
DROP INDEX "Order_customerId_idx";

-- DropIndex
DROP INDEX "Order_orgId_status_idx";

-- DropIndex
DROP INDEX "Payment_invoiceId_idx";

-- DropIndex
DROP INDEX "Payment_orgId_paidAt_idx";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "archivedAt" TIMESTAMPTZ(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "sourceLeadId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "customerSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "archivedAt" TIMESTAMPTZ(3),
ADD COLUMN     "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN     "completedAt" TIMESTAMPTZ(3),
ADD COLUMN     "confirmedAt" TIMESTAMPTZ(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "customerSnapshot" JSONB,
ADD COLUMN     "discountTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "fulfilledAt" TIMESTAMPTZ(3),
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sourceQuoteId" TEXT,
ADD COLUMN     "sourceQuoteVersionId" TEXT,
ADD COLUMN     "subtotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "taxTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMPTZ(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

UPDATE "Order" o
SET "customerSnapshot" = jsonb_build_object(
      'id', c."id", 'name', c."name", 'email', c."email", 'phone', c."phone",
      'address', c."address", 'taxId', c."taxId", 'type', c."type"
    ),
    "subtotal" = o."total",
    "updatedAt" = o."createdAt",
    "status" = CASE lower(o."status")
      WHEN 'pending' THEN 'DRAFT'
      WHEN 'confirmed' THEN 'CONFIRMED'
      WHEN 'processing' THEN 'PROCESSING'
      WHEN 'shipped' THEN 'FULFILLED'
      WHEN 'delivered' THEN 'COMPLETED'
      WHEN 'cancelled' THEN 'CANCELLED'
      ELSE upper(o."status")
    END
FROM "Customer" c
WHERE c."id" = o."customerId" AND c."orgId" = o."orgId";

ALTER TABLE "Order"
  ALTER COLUMN "customerSnapshot" SET NOT NULL,
  ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "confirmedAt" TIMESTAMPTZ(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "parentPaymentId" TEXT,
ADD COLUMN     "recordedById" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'PAYMENT',
ADD COLUMN     "voidedAt" TIMESTAMPTZ(3),
ALTER COLUMN "invoiceId" DROP NOT NULL;

UPDATE "Invoice" i
SET "customerSnapshot" = jsonb_build_object(
      'id', c."id", 'name', c."name", 'email', c."email", 'phone', c."phone",
      'address', c."address", 'taxId', c."taxId", 'type', c."type"
    )
FROM "Customer" c
WHERE c."id" = i."customerId" AND c."orgId" = i."orgId";

UPDATE "Payment" p
SET "status" = 'CONFIRMED',
    "confirmedAt" = p."paidAt",
    "currency" = i."currency",
    "orderId" = i."orderId"
FROM "Invoice" i
WHERE i."id" = p."invoiceId" AND i."orgId" = p."orgId";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "archivedAt" TIMESTAMPTZ(3),
ADD COLUMN     "cost" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lowStockThreshold" DECIMAL(19,4),
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'NON_STOCKED_PRODUCT';

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productType" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "discount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tax" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNumberCounter" (
    "orgId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrderNumberCounter_pkey" PRIMARY KEY ("orgId","year")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "initiatedBy" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "onHand" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "onHandDelta" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "reservedDelta" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "beforeOnHand" DECIMAL(19,4) NOT NULL,
    "afterOnHand" DECIMAL(19,4) NOT NULL,
    "beforeReserved" DECIMAL(19,4) NOT NULL,
    "afterReserved" DECIMAL(19,4) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "transferId" TEXT,
    "actorId" TEXT,
    "reason" TEXT,
    "reference" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "consumedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "releasedQuantity" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "actorId" TEXT,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fulfillment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "actorId" TEXT,
    "note" TEXT,
    "idempotencyKey" TEXT,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT,
    "warehouseId" TEXT,
    "quantity" DECIMAL(19,4) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FulfillmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL,
    "actorId" TEXT,
    "reference" TEXT,
    "reason" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ERPEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "actorId" TEXT,
    "initiatedBy" TEXT NOT NULL DEFAULT 'user',
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ERPEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_position_idx" ON "OrderItem"("orderId", "position");

-- CreateIndex
CREATE INDEX "OrderItem_orgId_productId_idx" ON "OrderItem"("orgId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_id_orderId_orgId_key" ON "OrderItem"("id", "orderId", "orgId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orgId_toStatus_createdAt_idx" ON "OrderStatusEvent"("orgId", "toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_actorId_idx" ON "OrderStatusEvent"("actorId");

-- CreateIndex
CREATE INDEX "Warehouse_orgId_active_name_idx" ON "Warehouse"("orgId", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_orgId_code_key" ON "Warehouse"("orgId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_id_orgId_key" ON "Warehouse"("id", "orgId");

-- CreateIndex
CREATE INDEX "InventoryBalance_orgId_productId_idx" ON "InventoryBalance"("orgId", "productId");

-- CreateIndex
CREATE INDEX "InventoryBalance_orgId_warehouseId_updatedAt_idx" ON "InventoryBalance"("orgId", "warehouseId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_orgId_warehouseId_productId_key" ON "InventoryBalance"("orgId", "warehouseId", "productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_orgId_productId_createdAt_idx" ON "InventoryMovement"("orgId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_orgId_warehouseId_createdAt_idx" ON "InventoryMovement"("orgId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_transferId_idx" ON "InventoryMovement"("transferId");

-- CreateIndex
CREATE INDEX "InventoryMovement_actorId_idx" ON "InventoryMovement"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_orgId_idempotencyKey_key" ON "InventoryMovement"("orgId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryReservation_orgId_warehouseId_productId_status_idx" ON "InventoryReservation"("orgId", "warehouseId", "productId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_orderId_status_idx" ON "InventoryReservation"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_orderItemId_warehouseId_key" ON "InventoryReservation"("orderItemId", "warehouseId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_orgId_productId_createdAt_idx" ON "InventoryTransfer"("orgId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransfer_orgId_fromWarehouseId_createdAt_idx" ON "InventoryTransfer"("orgId", "fromWarehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransfer_orgId_toWarehouseId_createdAt_idx" ON "InventoryTransfer"("orgId", "toWarehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransfer_actorId_idx" ON "InventoryTransfer"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_id_orgId_key" ON "InventoryTransfer"("id", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_orgId_idempotencyKey_key" ON "InventoryTransfer"("orgId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Fulfillment_orgId_completedAt_idx" ON "Fulfillment"("orgId", "completedAt");

-- CreateIndex
CREATE INDEX "Fulfillment_orderId_completedAt_idx" ON "Fulfillment"("orderId", "completedAt");

-- CreateIndex
CREATE INDEX "Fulfillment_actorId_idx" ON "Fulfillment"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Fulfillment_id_orgId_key" ON "Fulfillment"("id", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Fulfillment_orderId_number_key" ON "Fulfillment"("orderId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Fulfillment_orgId_idempotencyKey_key" ON "Fulfillment"("orgId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "FulfillmentItem_orderId_orderItemId_idx" ON "FulfillmentItem"("orderId", "orderItemId");

-- CreateIndex
CREATE INDEX "FulfillmentItem_orgId_fulfillmentId_idx" ON "FulfillmentItem"("orgId", "fulfillmentId");

-- CreateIndex
CREATE INDEX "FinanceEvent_orgId_currency_createdAt_idx" ON "FinanceEvent"("orgId", "currency", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceEvent_orgId_orderId_createdAt_idx" ON "FinanceEvent"("orgId", "orderId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceEvent_paymentId_idx" ON "FinanceEvent"("paymentId");

-- CreateIndex
CREATE INDEX "FinanceEvent_actorId_idx" ON "FinanceEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceEvent_orgId_idempotencyKey_key" ON "FinanceEvent"("orgId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ERPEvent_orgId_status_availableAt_idx" ON "ERPEvent"("orgId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "ERPEvent_orgId_aggregateType_aggregateId_createdAt_idx" ON "ERPEvent"("orgId", "aggregateType", "aggregateId", "createdAt");

-- CreateIndex
CREATE INDEX "ERPEvent_actorId_idx" ON "ERPEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "ERPEvent_orgId_idempotencyKey_key" ON "ERPEvent"("orgId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Customer_orgId_archivedAt_createdAt_idx" ON "Customer"("orgId", "archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_orgId_name_idx" ON "Customer"("orgId", "name");

-- CreateIndex
CREATE INDEX "Customer_createdById_idx" ON "Customer"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_orgId_sourceLeadId_key" ON "Customer"("orgId", "sourceLeadId");

-- CreateIndex
CREATE INDEX "Invoice_orgId_status_createdAt_idx" ON "Invoice"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_orgId_customerId_createdAt_idx" ON "Invoice"("orgId", "customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_id_orgId_key" ON "Invoice"("id", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_orgId_key" ON "Invoice"("orderId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_sourceQuoteVersionId_key" ON "Order"("sourceQuoteVersionId");

-- CreateIndex
CREATE INDEX "Order_orgId_createdAt_idx" ON "Order"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_orgId_status_createdAt_idx" ON "Order"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_orgId_customerId_createdAt_idx" ON "Order"("orgId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_sourceQuoteId_orgId_idx" ON "Order"("sourceQuoteId", "orgId");

-- CreateIndex
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Order_id_orgId_key" ON "Order"("id", "orgId");

-- CreateIndex
CREATE INDEX "Payment_orgId_orderId_paidAt_idx" ON "Payment"("orgId", "orderId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_orgId_invoiceId_paidAt_idx" ON "Payment"("orgId", "invoiceId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_orgId_status_paidAt_idx" ON "Payment"("orgId", "status", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_parentPaymentId_orgId_idx" ON "Payment"("parentPaymentId", "orgId");

-- CreateIndex
CREATE INDEX "Payment_recordedById_idx" ON "Payment"("recordedById");

-- CreateIndex
CREATE INDEX "Payment_confirmedById_idx" ON "Payment"("confirmedById");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_id_orgId_key" ON "Payment"("id", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orgId_idempotencyKey_key" ON "Payment"("orgId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_sourceLeadId_orgId_fkey" FOREIGN KEY ("sourceLeadId", "orgId") REFERENCES "Lead"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_orgId_fkey" FOREIGN KEY ("customerId", "orgId") REFERENCES "Customer"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sourceQuoteVersionId_sourceQuoteId_orgId_fkey" FOREIGN KEY ("sourceQuoteVersionId", "sourceQuoteId", "orgId") REFERENCES "QuoteVersion"("id", "quoteId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_orgId_fkey" FOREIGN KEY ("orderId", "orgId") REFERENCES "Order"("id", "orgId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_orgId_fkey" FOREIGN KEY ("productId", "orgId") REFERENCES "Product"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNumberCounter" ADD CONSTRAINT "OrderNumberCounter_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_orgId_fkey" FOREIGN KEY ("orderId", "orgId") REFERENCES "Order"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_warehouseId_orgId_fkey" FOREIGN KEY ("warehouseId", "orgId") REFERENCES "Warehouse"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_productId_orgId_fkey" FOREIGN KEY ("productId", "orgId") REFERENCES "Product"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseId_orgId_fkey" FOREIGN KEY ("warehouseId", "orgId") REFERENCES "Warehouse"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_orgId_fkey" FOREIGN KEY ("productId", "orgId") REFERENCES "Product"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_transferId_orgId_fkey" FOREIGN KEY ("transferId", "orgId") REFERENCES "InventoryTransfer"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_orgId_fkey" FOREIGN KEY ("orderId", "orgId") REFERENCES "Order"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderItemId_orderId_orgId_fkey" FOREIGN KEY ("orderItemId", "orderId", "orgId") REFERENCES "OrderItem"("id", "orderId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_warehouseId_orgId_fkey" FOREIGN KEY ("warehouseId", "orgId") REFERENCES "Warehouse"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_orgId_fkey" FOREIGN KEY ("productId", "orgId") REFERENCES "Product"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_fromWarehouseId_orgId_fkey" FOREIGN KEY ("fromWarehouseId", "orgId") REFERENCES "Warehouse"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_toWarehouseId_orgId_fkey" FOREIGN KEY ("toWarehouseId", "orgId") REFERENCES "Warehouse"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_productId_orgId_fkey" FOREIGN KEY ("productId", "orgId") REFERENCES "Product"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_orderId_orgId_fkey" FOREIGN KEY ("orderId", "orgId") REFERENCES "Order"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_fulfillmentId_orgId_fkey" FOREIGN KEY ("fulfillmentId", "orgId") REFERENCES "Fulfillment"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_orderItemId_orderId_orgId_fkey" FOREIGN KEY ("orderItemId", "orderId", "orgId") REFERENCES "OrderItem"("id", "orderId", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_productId_orgId_fkey" FOREIGN KEY ("productId", "orgId") REFERENCES "Product"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_warehouseId_orgId_fkey" FOREIGN KEY ("warehouseId", "orgId") REFERENCES "Warehouse"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_orgId_fkey" FOREIGN KEY ("customerId", "orgId") REFERENCES "Customer"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_orgId_fkey" FOREIGN KEY ("orderId", "orgId") REFERENCES "Order"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_orgId_fkey" FOREIGN KEY ("invoiceId", "orgId") REFERENCES "Invoice"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_orgId_fkey" FOREIGN KEY ("orderId", "orgId") REFERENCES "Order"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_parentPaymentId_orgId_fkey" FOREIGN KEY ("parentPaymentId", "orgId") REFERENCES "Payment"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEvent" ADD CONSTRAINT "FinanceEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEvent" ADD CONSTRAINT "FinanceEvent_orderId_orgId_fkey" FOREIGN KEY ("orderId", "orgId") REFERENCES "Order"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEvent" ADD CONSTRAINT "FinanceEvent_paymentId_orgId_fkey" FOREIGN KEY ("paymentId", "orgId") REFERENCES "Payment"("id", "orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEvent" ADD CONSTRAINT "FinanceEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ERPEvent" ADD CONSTRAINT "ERPEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ERPEvent" ADD CONSTRAINT "ERPEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Business invariants. Quantities and money stay deterministic numeric values.
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_type_check" CHECK ("type" IN ('individual','business'));
ALTER TABLE "Product" ADD CONSTRAINT "Product_type_check" CHECK ("type" IN ('STOCKED_PRODUCT','NON_STOCKED_PRODUCT','SERVICE'));
ALTER TABLE "Product" ADD CONSTRAINT "Product_operational_values_check" CHECK ("price" >= 0 AND "cost" >= 0 AND ("lowStockThreshold" IS NULL OR "lowStockThreshold" >= 0));
ALTER TABLE "Order" ADD CONSTRAINT "Order_status_check" CHECK ("status" IN ('DRAFT','CONFIRMED','PROCESSING','PARTIALLY_FULFILLED','FULFILLED','COMPLETED','CANCELLED'));
ALTER TABLE "Order" ADD CONSTRAINT "Order_money_check" CHECK ("subtotal" >= 0 AND "discountTotal" >= 0 AND "taxTotal" >= 0 AND "total" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_revision_check" CHECK ("revision" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "Order" ADD CONSTRAINT "Order_quote_source_check" CHECK (("sourceQuoteId" IS NULL) = ("sourceQuoteVersionId" IS NULL));
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_type_check" CHECK ("productType" IN ('STOCKED_PRODUCT','NON_STOCKED_PRODUCT','SERVICE'));
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_values_check" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "lineTotal" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_identity_check" CHECK (length(btrim("code")) BETWEEN 1 AND 40 AND length(btrim("name")) BETWEEN 1 AND 160);
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_values_check" CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand" AND "revision" > 0);
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_type_check" CHECK ("type" IN ('RECEIPT','ISSUE','RESERVATION','RELEASE','ADJUSTMENT','TRANSFER_IN','TRANSFER_OUT','RETURN'));
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_values_check" CHECK (
  "quantity" > 0 AND
  "afterOnHand" = "beforeOnHand" + "onHandDelta" AND
  "afterReserved" = "beforeReserved" + "reservedDelta" AND
  "beforeOnHand" >= 0 AND "afterOnHand" >= 0 AND
  "beforeReserved" >= 0 AND "afterReserved" >= 0 AND
  "beforeReserved" <= "beforeOnHand" AND "afterReserved" <= "afterOnHand"
);
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_status_check" CHECK ("status" IN ('ACTIVE','PARTIALLY_CONSUMED','CONSUMED','RELEASED'));
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_values_check" CHECK ("quantity" > 0 AND "consumedQuantity" >= 0 AND "releasedQuantity" >= 0 AND "consumedQuantity" + "releasedQuantity" <= "quantity");
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_values_check" CHECK ("quantity" > 0 AND "fromWarehouseId" <> "toWarehouseId" AND length(btrim("reason")) > 0);
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_status_check" CHECK ("status" = 'COMPLETED');
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_status_check" CHECK ("status" IN ('PENDING','CONFIRMED','VOIDED'));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_type_check" CHECK ("type" IN ('PAYMENT','REFUND','REVERSAL'));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_values_check" CHECK ("amount" > 0 AND "currency" ~ '^[A-Z]{3}$' AND ("orderId" IS NOT NULL OR "invoiceId" IS NOT NULL));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_parent_check" CHECK (("type" = 'PAYMENT' AND "parentPaymentId" IS NULL) OR ("type" IN ('REFUND','REVERSAL') AND "parentPaymentId" IS NOT NULL));
ALTER TABLE "FinanceEvent" ADD CONSTRAINT "FinanceEvent_values_check" CHECK ("amount" > 0 AND "currency" ~ '^[A-Z]{3}$');
ALTER TABLE "FinanceEvent" ADD CONSTRAINT "FinanceEvent_type_check" CHECK ("type" IN ('PAYMENT_RECEIVED','REFUND','PAYMENT_VOIDED','ADJUSTMENT'));
ALTER TABLE "ERPEvent" ADD CONSTRAINT "ERPEvent_status_check" CHECK ("status" IN ('PENDING','DISPATCHED','FAILED'));

-- Add ORDER to the existing DocumentFlow source boundary. Files remain owned
-- and authorized by DocumentFlow; this only validates their business link.
ALTER TABLE "DocumentRecord" DROP CONSTRAINT "DocumentRecord_source_type_check";
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_source_type_check" CHECK ("sourceType" IN ('UPLOAD','QUOTE','ORDER','LEAD','CUSTOMER','TASK','SYSTEM'));

CREATE OR REPLACE FUNCTION public.haydev_assert_document_source_tenant()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE source_found BOOLEAN;
BEGIN
  IF NEW."sourceType" IN ('UPLOAD','SYSTEM') THEN
    IF NEW."sourceId" IS NOT NULL THEN RAISE EXCEPTION 'Upload/system documents cannot carry an entity source id'; END IF;
    RETURN NEW;
  END IF;
  IF NEW."sourceId" IS NULL THEN RAISE EXCEPTION 'Entity-backed document requires a source id'; END IF;
  CASE NEW."sourceType"
    WHEN 'QUOTE' THEN SELECT EXISTS(SELECT 1 FROM public."Quote" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    WHEN 'ORDER' THEN SELECT EXISTS(SELECT 1 FROM public."Order" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    WHEN 'LEAD' THEN SELECT EXISTS(SELECT 1 FROM public."Lead" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    WHEN 'CUSTOMER' THEN SELECT EXISTS(SELECT 1 FROM public."Customer" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    WHEN 'TASK' THEN SELECT EXISTS(SELECT 1 FROM public."Task" WHERE "id" = NEW."sourceId" AND "orgId" = NEW."orgId") INTO source_found;
    ELSE source_found := false;
  END CASE;
  IF NOT source_found THEN RAISE EXCEPTION 'Document source must belong to the same tenant'; END IF;
  RETURN NEW;
END;
$$;

-- Runtime guards: append-only ledgers, immutable snapshots, and canonical
-- state transitions survive accidental direct Prisma updates.
CREATE FUNCTION public.haydev_protect_order()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_user <> 'haydev_runtime' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Orders are business records and cannot be deleted'; END IF;
  IF (NEW."orgId", NEW."customerId", NEW."sourceQuoteId", NEW."sourceQuoteVersionId", NEW."currency",
      NEW."subtotal", NEW."discountTotal", NEW."taxTotal", NEW."total", NEW."customerSnapshot", NEW."createdById", NEW."createdAt")
     IS DISTINCT FROM
     (OLD."orgId", OLD."customerId", OLD."sourceQuoteId", OLD."sourceQuoteVersionId", OLD."currency",
      OLD."subtotal", OLD."discountTotal", OLD."taxTotal", OLD."total", OLD."customerSnapshot", OLD."createdById", OLD."createdAt") THEN
    RAISE EXCEPTION 'Order source, customer, and financial snapshots are immutable';
  END IF;
  IF NEW."revision" <> OLD."revision" + 1 THEN RAISE EXCEPTION 'Order updates require an exact revision increment'; END IF;
  IF NEW."status" <> OLD."status" AND NOT (
    (OLD."status" = 'DRAFT' AND NEW."status" IN ('CONFIRMED','CANCELLED')) OR
    (OLD."status" = 'CONFIRMED' AND NEW."status" IN ('PROCESSING','PARTIALLY_FULFILLED','FULFILLED','CANCELLED')) OR
    (OLD."status" = 'PROCESSING' AND NEW."status" IN ('PARTIALLY_FULFILLED','FULFILLED','CANCELLED')) OR
    (OLD."status" = 'PARTIALLY_FULFILLED' AND NEW."status" = 'FULFILLED') OR
    (OLD."status" = 'FULFILLED' AND NEW."status" = 'COMPLETED')
  ) THEN RAISE EXCEPTION 'Invalid order state transition from % to %', OLD."status", NEW."status"; END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.haydev_protect_payment()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_user <> 'haydev_runtime' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Payments cannot be deleted'; END IF;
  IF OLD."status" IN ('CONFIRMED','VOIDED') THEN RAISE EXCEPTION 'Final payments are immutable; create a refund or reversal'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','confirmedAt','confirmedById','voidedAt']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','confirmedAt','confirmedById','voidedAt']) THEN
    RAISE EXCEPTION 'Payment identity and amount are immutable';
  END IF;
  IF OLD."status" = 'PENDING' AND NEW."status" NOT IN ('PENDING','CONFIRMED','VOIDED') THEN
    RAISE EXCEPTION 'Invalid payment transition';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.haydev_protect_erp_event()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_user <> 'haydev_runtime' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'ERP events are append-only'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','dispatchedAt']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','dispatchedAt']) THEN
    RAISE EXCEPTION 'ERP event payload is immutable';
  END IF;
  IF OLD."status" <> 'PENDING' OR NEW."status" NOT IN ('DISPATCHED','FAILED') THEN RAISE EXCEPTION 'ERP event is final'; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Order_runtime_protected" BEFORE UPDATE OR DELETE ON "Order" FOR EACH ROW EXECUTE FUNCTION public.haydev_protect_order();
CREATE TRIGGER "OrderItem_runtime_immutable" BEFORE UPDATE OR DELETE ON "OrderItem" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "OrderStatusEvent_runtime_immutable" BEFORE UPDATE OR DELETE ON "OrderStatusEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "InventoryMovement_runtime_immutable" BEFORE UPDATE OR DELETE ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "InventoryTransfer_runtime_immutable" BEFORE UPDATE OR DELETE ON "InventoryTransfer" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "Fulfillment_runtime_immutable" BEFORE UPDATE OR DELETE ON "Fulfillment" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "FulfillmentItem_runtime_immutable" BEFORE UPDATE OR DELETE ON "FulfillmentItem" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "FinanceEvent_runtime_immutable" BEFORE UPDATE OR DELETE ON "FinanceEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_prevent_runtime_history_mutation();
CREATE TRIGGER "Payment_runtime_protected" BEFORE UPDATE OR DELETE ON "Payment" FOR EACH ROW EXECUTE FUNCTION public.haydev_protect_payment();
CREATE TRIGGER "ERPEvent_runtime_protected" BEFORE UPDATE OR DELETE ON "ERPEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_protect_erp_event();

CREATE TRIGGER "Customer_creator_membership" BEFORE INSERT OR UPDATE OF "createdById", "orgId" ON "Customer" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');
CREATE TRIGGER "Order_creator_membership" BEFORE INSERT OR UPDATE OF "createdById", "orgId" ON "Order" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('createdById');
CREATE TRIGGER "OrderStatusEvent_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "OrderStatusEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');
CREATE TRIGGER "InventoryMovement_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');
CREATE TRIGGER "InventoryTransfer_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "InventoryTransfer" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');
CREATE TRIGGER "Fulfillment_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "Fulfillment" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');
CREATE TRIGGER "Payment_recorder_membership" BEFORE INSERT OR UPDATE OF "recordedById", "orgId" ON "Payment" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('recordedById');
CREATE TRIGGER "Payment_confirmer_membership" BEFORE INSERT OR UPDATE OF "confirmedById", "orgId" ON "Payment" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('confirmedById');
CREATE TRIGGER "FinanceEvent_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "FinanceEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');
CREATE TRIGGER "ERPEvent_actor_membership" BEFORE INSERT OR UPDATE OF "actorId", "orgId" ON "ERPEvent" FOR EACH ROW EXECUTE FUNCTION public.haydev_assert_org_membership('actorId');

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'OrderItem','OrderNumberCounter','OrderStatusEvent','Warehouse','InventoryBalance',
    'InventoryMovement','InventoryReservation','InventoryTransfer','Fulfillment',
    'FulfillmentItem','FinanceEvent','ERPEvent'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY haydev_runtime_server_access ON public.%I FOR ALL TO haydev_runtime USING (true) WITH CHECK (true)', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', table_name); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM authenticated', table_name); END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO haydev_runtime', table_name);
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE public."Customer", public."Product", public."Order", public."Invoice", public."Payment" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE public."Customer", public."Product", public."Order", public."Invoice", public."Payment" FROM authenticated;
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."Customer", public."Product", public."Order", public."Invoice", public."Payment" TO haydev_runtime;

REVOKE EXECUTE ON FUNCTION public.haydev_assert_document_source_tenant() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_protect_order() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_protect_payment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.haydev_protect_erp_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.haydev_assert_document_source_tenant() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_protect_order() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_protect_payment() TO haydev_runtime;
GRANT EXECUTE ON FUNCTION public.haydev_protect_erp_event() TO haydev_runtime;
