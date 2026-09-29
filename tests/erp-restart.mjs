#!/usr/bin/env node

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
const orderId = process.env.HAYDEV_TEST_ERP_ORDER_ID;

if (!email || !password || !orderId) {
  throw new Error("HAYDEV_TEST_EMAIL, HAYDEV_TEST_PASSWORD, and HAYDEV_TEST_ERP_ORDER_ID are required.");
}

async function expectStatus(response, status, label) {
  if (response.status !== status) {
    throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  }
  return response;
}

const login = await expectStatus(await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email, password }),
}), 200, "ERP restart login");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0] ?? "";
if (!cookie) throw new Error("ERP restart login did not return a session cookie.");

const orderResponse = await expectStatus(await fetch(`${baseUrl}/api/erp/orders/${encodeURIComponent(orderId)}`, {
  headers: { cookie },
}), 200, "persisted ERP order after restart");
const order = (await orderResponse.json()).order;
if (order.id !== orderId || !Array.isArray(order.items) || !order.customerSnapshot) {
  throw new Error("Persisted ERP order snapshot is incomplete after restart.");
}

await expectStatus(await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl, cookie },
}), 204, "ERP restart logout");

console.log(`PASS: ERP order ${orderId} persisted across application restart`);
