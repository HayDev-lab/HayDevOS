#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
const adminUrl = process.env.HAYDEV_TEST_ADMIN_DATABASE_URL || process.env.DIRECT_URL;
if (!email || !password || !adminUrl) throw new Error("HAYDEV_TEST_EMAIL, HAYDEV_TEST_PASSWORD, and HAYDEV_TEST_ADMIN_DATABASE_URL/DIRECT_URL are required.");
const adminPoolUrl = new URL(adminUrl);
adminPoolUrl.searchParams.set("connection_limit", "3");
const db = new PrismaClient({ datasources: { db: { url: adminPoolUrl.toString() } } });
const suffix = `${Date.now()}_${process.pid}`;
let cookie = ""; let orgId = ""; let userId = ""; let orgB = "";

async function expect(response, status, label) {
  if (response.status !== status) throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  console.log(`PASS: ${label} (${status})`); return response;
}
const headers = () => ({ "content-type": "application/json", origin: baseUrl, cookie });
const post = (path, body, key = `erp-${suffix}-${crypto.randomUUID()}`) => fetch(`${baseUrl}${path}`, { method: "POST", headers: { ...headers(), "idempotency-key": key }, body: JSON.stringify(body) });

async function acceptedQuote(index, productId, quantity = "1", unitPrice = "10") {
  const quoteId = `erp_quote_${suffix}_${index}`; const versionId = `erp_version_${suffix}_${index}`;
  const total = (Number(quantity) * Number(unitPrice)).toFixed(2);
  await db.quote.create({ data: { id: quoteId, orgId, number: `ERP-Q-${suffix}-${index}`, customerName: `ERP Customer ${index}`, currency: "USD", status: "accepted", acceptedAt: new Date(), subtotal: total, total, revision: 1 } });
  await db.quoteVersion.create({ data: {
    id: versionId, orgId, quoteId, versionNumber: 1, status: "accepted", currency: "USD",
    customerSnapshot: { id: null, name: `ERP Customer ${index}`, email: `erp-${index}@example.invalid`, address: "Snapshot address", taxId: `TAX-${index}` },
    itemsSnapshot: [{ productId, productName: `Stock snapshot ${index}`, description: "Immutable line", unit: "each", quantity, listPrice: unitPrice, unitPrice, discountType: "percent", discountValue: "0", discount: "0.00", quoteDiscountShare: "0.00", taxRate: "0", tax: "0.00", subtotal: total, total, manualPriceOverride: false, priceOverrideReason: null, position: 0 }],
    quoteSnapshot: { number: `ERP-Q-${suffix}-${index}`, revision: 1 }, subtotal: total, lineDiscount: 0, quoteDiscount: 0, tax: 0, total,
  } });
  await db.quote.update({ where: { id: quoteId }, data: { currentVersionId: versionId, acceptedVersionId: versionId, currentVersionNumber: 1 } });
  return { quoteId, versionId, total };
}

async function createOrder(fixture, label) {
  const response = await expect(await post("/api/erp/orders", { quoteId: fixture.quoteId }), 201, label);
  return (await response.json()).order;
}

try {
  const login = await expect(await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email, password }) }), 200, "ERP login");
  cookie = login.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
  const session = (await login.json()).session; orgId = session.activeOrganization.id; userId = session.user.id;
  if (!cookie || !orgId || !userId) throw new Error("Login did not provide tenant context.");

  await expect(await fetch(`${baseUrl}/api/erp/overview`, { headers: { cookie } }), 200, "authoritative ERP overview");
  const draftQuoteId = `erp_draft_quote_${suffix}`;
  await db.quote.create({ data: { id: draftQuoteId, orgId, number: `ERP-DRAFT-${suffix}`, customerName: "Draft customer", currency: "USD", status: "draft", subtotal: "1", total: "1" } });
  await expect(await post("/api/erp/orders", { quoteId: draftQuoteId }), 409, "non-accepted quote rejected");
  await expect(await post("/api/erp/products", { sku: `STOCK-${suffix}`, name: "Gate 6 stock", type: "STOCKED_PRODUCT", price: "10", cost: "4", currency: "USD", unit: "each", lowStockThreshold: "2", active: true }), 201, "canonical stocked product");
  const products = await (await fetch(`${baseUrl}/api/erp/products?limit=100&q=${encodeURIComponent(`STOCK-${suffix}`)}`, { headers: { cookie } })).json();
  const product = products.items[0]; if (!product) throw new Error("Product was not persisted.");
  const whAResponse = await expect(await post("/api/erp/warehouses", { code: `A${Date.now()}`, name: "Gate 6 Main" }), 201, "main warehouse");
  const whA = (await whAResponse.json()).warehouse;
  const whBResponse = await expect(await post("/api/erp/warehouses", { code: `B${Date.now()}`, name: "Gate 6 Transit" }), 201, "destination warehouse");
  const whB = (await whBResponse.json()).warehouse;
  await expect(await post("/api/erp/inventory/receive", { warehouseId: whA.id, productId: product.id, quantity: "10", reason: "Opening receipt" }), 201, "ledger receipt");

  const duplicateFixture = await acceptedQuote("duplicate", product.id, "1");
  const duplicates = await Promise.all(Array.from({ length: 8 }, () => post("/api/erp/orders", { quoteId: duplicateFixture.quoteId }, `dup-${suffix}-${crypto.randomUUID()}`)));
  for (const response of duplicates) await expect(response, 201, "idempotent accepted quote replay");
  const duplicateIds = (await Promise.all(duplicates.map((response) => response.json()))).map((body) => body.order.id);
  if (new Set(duplicateIds).size !== 1) throw new Error("Accepted quote created more than one order.");
  if (await db.order.count({ where: { orgId, sourceQuoteVersionId: duplicateFixture.versionId } }) !== 1) throw new Error("Database does not enforce one order per accepted version.");

  const numberedFixtures = await Promise.all(Array.from({ length: 16 }, (_, index) => acceptedQuote(`number_${index}`, product.id, "1")));
  const numberedResponses = await Promise.all(numberedFixtures.map((fixture, index) => post("/api/erp/orders", { quoteId: fixture.quoteId }, `number-${suffix}-${index}`)));
  for (const [index, response] of numberedResponses.entries()) await expect(response, 201, `concurrent order number ${index + 1}`);
  const numberedOrders = (await Promise.all(numberedResponses.map((response) => response.json()))).map((body) => body.order);
  if (new Set(numberedOrders.map((order) => order.number)).size !== numberedOrders.length) throw new Error("Concurrent order numbering produced duplicates.");
  console.log("PASS: atomic tenant order numbering is unique");

  const snapshotOrder = numberedOrders[0];
  await expect(await fetch(`${baseUrl}/api/erp/products/${product.id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ name: "Changed canonical name", price: "999" }) }), 200, "canonical product changes after order snapshot");
  const snapshotRead = (await (await expect(await fetch(`${baseUrl}/api/erp/orders/${snapshotOrder.id}`, { headers: { cookie } }), 200, "immutable order snapshot read")).json()).order;
  if (snapshotRead.items[0].name !== "Stock snapshot number_0" || snapshotRead.items[0].unitPrice !== "10.0000") throw new Error("Canonical product mutation changed order snapshot.");

  const raceFixtures = await Promise.all([acceptedQuote("race_a", product.id, "7"), acceptedQuote("race_b", product.id, "7")]);
  const raceOrders = await Promise.all(raceFixtures.map((fixture, index) => createOrder(fixture, `stock race order ${index + 1}`)));
  const confirmations = await Promise.all(raceOrders.map((order, index) => post(`/api/erp/orders/${order.id}/confirm`, { expectedRevision: order.revision, warehouseId: whA.id }, `confirm-race-${suffix}-${index}`)));
  const success = confirmations.filter((response) => response.status === 200); const conflicts = confirmations.filter((response) => response.status === 409);
  if (success.length !== 1 || conflicts.length !== 1) throw new Error(`Concurrent reservation expected one success/one conflict, got ${confirmations.map((r) => r.status)}`);
  console.log("PASS: concurrent reservations cannot oversell stock");
  const raceStates = await Promise.all(raceOrders.map(async (order) => (await (await fetch(`${baseUrl}/api/erp/orders/${order.id}`, { headers: { cookie } })).json()).order));
  for (const order of raceStates) await expect(await post(`/api/erp/orders/${order.id}/cancel`, { expectedRevision: order.revision, reason: "Release race reservation" }), 200, "cancellation releases or closes order");
  let inventory = (await (await fetch(`${baseUrl}/api/erp/inventory?limit=100&productId=${product.id}`, { headers: { cookie } })).json()).items;
  let main = inventory.find((row) => row.warehouseId === whA.id);
  if (main.onHand !== "10.0000" || main.reserved !== "0.0000") throw new Error("Cancellation did not release reservation.");

  const fulfillFixture = await acceptedQuote("fulfill", product.id, "7"); let fulfillmentOrder = await createOrder(fulfillFixture, "fulfillment order");
  fulfillmentOrder = (await (await expect(await post(`/api/erp/orders/${fulfillmentOrder.id}/confirm`, { expectedRevision: fulfillmentOrder.revision, warehouseId: whA.id }), 200, "fulfillment order confirmed")).json()).order;
  let fulfillment = await expect(await post(`/api/erp/orders/${fulfillmentOrder.id}/fulfillments`, { expectedRevision: fulfillmentOrder.revision, items: [{ orderItemId: fulfillmentOrder.items[0].id, quantity: "4" }] }), 201, "partial fulfillment");
  let fulfilledBody = (await fulfillment.json()).fulfillment;
  fulfillmentOrder = (await (await fetch(`${baseUrl}/api/erp/orders/${fulfillmentOrder.id}`, { headers: { cookie } })).json()).order;
  if (fulfillmentOrder.status !== "PARTIALLY_FULFILLED") throw new Error("Partial fulfillment did not update state.");
  await expect(await post(`/api/erp/orders/${fulfillmentOrder.id}/fulfillments`, { expectedRevision: fulfillmentOrder.revision, items: [{ orderItemId: fulfillmentOrder.items[0].id, quantity: "4" }] }), 409, "over-fulfillment rejected");
  fulfillment = await expect(await post(`/api/erp/orders/${fulfillmentOrder.id}/fulfillments`, { expectedRevision: fulfillmentOrder.revision, items: [{ orderItemId: fulfillmentOrder.items[0].id, quantity: "3" }] }), 201, "final fulfillment");
  fulfilledBody = (await fulfillment.json()).fulfillment; void fulfilledBody;
  fulfillmentOrder = (await (await fetch(`${baseUrl}/api/erp/orders/${fulfillmentOrder.id}`, { headers: { cookie } })).json()).order;
  if (fulfillmentOrder.status !== "FULFILLED") throw new Error("Final fulfillment did not update state.");
  inventory = (await (await fetch(`${baseUrl}/api/erp/inventory?limit=100&productId=${product.id}`, { headers: { cookie } })).json()).items; main = inventory.find((row) => row.warehouseId === whA.id);
  if (main.onHand !== "3.0000" || main.reserved !== "0.0000") throw new Error("Fulfillment ledger balance is wrong.");

  await expect(await post("/api/erp/inventory/transfer", { fromWarehouseId: whA.id, toWarehouseId: whB.id, productId: product.id, quantity: "2", reason: "Gate 6 transfer" }), 201, "atomic transfer");
  await expect(await post("/api/erp/inventory/transfer", { fromWarehouseId: whA.id, toWarehouseId: whB.id, productId: product.id, quantity: "99", reason: "Must fail atomically" }), 409, "insufficient transfer rejected atomically");
  inventory = (await (await fetch(`${baseUrl}/api/erp/inventory?limit=100&productId=${product.id}`, { headers: { cookie } })).json()).items;
  const byWarehouse = new Map(inventory.map((row) => [row.warehouseId, row]));
  if (byWarehouse.get(whA.id).onHand !== "1.0000" || byWarehouse.get(whB.id).onHand !== "2.0000") throw new Error("Transfer conservation failed.");

  await expect(await post("/api/erp/payments", { orderId: fulfillmentOrder.id, amount: "40", currency: "USD", method: "bank", paid: true }), 422, "client-paid flag rejected");
  const pay40 = (await (await expect(await post("/api/erp/payments", { orderId: fulfillmentOrder.id, amount: "40", currency: "USD", method: "bank" }), 201, "payment 40 recorded pending")).json()).payment;
  await expect(await post(`/api/erp/payments/${pay40.id}/confirm`, {}), 200, "payment 40 confirmed");
  let paidOrder = (await (await fetch(`${baseUrl}/api/erp/orders/${fulfillmentOrder.id}`, { headers: { cookie } })).json()).order;
  if (paidOrder.payments.status !== "PARTIALLY_PAID") throw new Error("Partial payment state is wrong.");
  const pay30 = (await (await expect(await post("/api/erp/payments", { orderId: fulfillmentOrder.id, amount: "30", currency: "USD", method: "card" }), 201, "payment 30 recorded pending")).json()).payment;
  await expect(await post(`/api/erp/payments/${pay30.id}/confirm`, {}), 200, "payment 30 confirmed");
  const eur = (await (await expect(await post("/api/erp/payments", { orderId: fulfillmentOrder.id, amount: "99", currency: "EUR", method: "bank" }), 201, "different-currency payment recorded")).json()).payment;
  await expect(await post(`/api/erp/payments/${eur.id}/confirm`, {}), 200, "different-currency payment confirmed separately");
  paidOrder = (await (await fetch(`${baseUrl}/api/erp/orders/${fulfillmentOrder.id}`, { headers: { cookie } })).json()).order;
  if (paidOrder.payments.status !== "PAID" || paidOrder.payments.unmatchedCurrencies[0]?.currency !== "EUR") throw new Error("Payment computation performed implicit FX or missed full payment.");
  await expect(await post(`/api/erp/payments/${pay40.id}/refund`, { amount: "10", reason: "Partial refund" }), 201, "append-only refund");
  paidOrder = (await (await fetch(`${baseUrl}/api/erp/orders/${fulfillmentOrder.id}`, { headers: { cookie } })).json()).order;
  if (paidOrder.payments.status !== "PARTIALLY_PAID" || paidOrder.payments.netReceived !== "60.0000") throw new Error("Refund did not recompute payment status.");
  try {
    await db.$transaction(async (tx) => { await tx.$executeRawUnsafe("SET LOCAL ROLE haydev_runtime"); await tx.payment.update({ where: { id: pay40.id }, data: { reference: "tampered" } }); });
    throw new Error("Confirmed payment update unexpectedly succeeded.");
  } catch (error) { if (error.message === "Confirmed payment update unexpectedly succeeded.") throw error; console.log("PASS: confirmed payment is database-immutable"); }

  const staleFixture = await acceptedQuote("stale", product.id, "1"); const staleOrder = await createOrder(staleFixture, "stale revision order");
  const staleWrites = await Promise.all([post(`/api/erp/orders/${staleOrder.id}/cancel`, { expectedRevision: staleOrder.revision, reason: "first" }), post(`/api/erp/orders/${staleOrder.id}/cancel`, { expectedRevision: staleOrder.revision, reason: "second" })]);
  if (staleWrites.filter((r) => r.status === 200).length !== 1 || staleWrites.filter((r) => r.status === 409).length !== 1) throw new Error("Stale revision write was not rejected.");
  console.log("PASS: stale order revision rejected");

  const documentId = `erp_document_${suffix}`;
  await db.documentRecord.create({ data: { id: documentId, orgId, filename: "order-note.pdf", mime: "application/pdf", size: 10, status: "PENDING_SCAN", title: "Order note", documentType: "upload", sourceType: "UPLOAD" } });
  await expect(await post(`/api/erp/orders/${fulfillmentOrder.id}/documents`, { documentId }), 200, "DocumentFlow order source linked");
  const linked = await db.documentRecord.findUnique({ where: { id: documentId } }); if (linked.sourceType !== "ORDER" || linked.sourceId !== fulfillmentOrder.id) throw new Error("Document order binding was not persisted.");

  orgB = `erp_org_b_${suffix}`;
  await db.organization.create({ data: { id: orgB, name: "ERP isolated tenant", slug: `erp-isolated-${suffix.replaceAll("_", "-")}` } });
  await db.membership.create({ data: { orgId: orgB, userId, role: "OWNER" } }); await db.quoteSettings.create({ data: { orgId: orgB } });
  await expect(await fetch(`${baseUrl}/api/auth/organization`, { method: "POST", headers: headers(), body: JSON.stringify({ orgId: orgB }) }), 200, "switch to isolated ERP tenant");
  await expect(await fetch(`${baseUrl}/api/erp/orders/${fulfillmentOrder.id}`, { headers: { cookie } }), 404, "cross-tenant order hidden");
  const isolatedInventory = await expect(await fetch(`${baseUrl}/api/erp/inventory?limit=100`, { headers: { cookie } }), 200, "isolated tenant inventory");
  if ((await isolatedInventory.json()).items.length !== 0) throw new Error("Inventory leaked across organization switch.");
  await expect(await fetch(`${baseUrl}/api/auth/organization`, { method: "POST", headers: headers(), body: JSON.stringify({ orgId }) }), 200, "switch back to original ERP tenant");
  await expect(await fetch(`${baseUrl}/api/erp/orders/${fulfillmentOrder.id}`, { headers: { cookie } }), 200, "original ERP order restored without cache bleed");
  console.log(`PERSISTED_ERP_ORDER_ID=${fulfillmentOrder.id}`);
  await expect(await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: headers() }), 204, "ERP logout");
  console.log("PASS: ERP production HTTP and concurrency suite completed");
} finally {
  if (orgB) await db.organization.deleteMany({ where: { id: orgB } });
  await db.$disconnect();
}
