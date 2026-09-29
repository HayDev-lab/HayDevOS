#!/usr/bin/env node
const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL; const password = process.env.HAYDEV_TEST_PASSWORD;
if (!email || !password) throw new Error("HAYDEV_TEST_EMAIL and HAYDEV_TEST_PASSWORD are required.");
async function expect(response, status, label) { if (response.status !== status) throw new Error(`${label}: expected ${status}, got ${response.status}: ${await response.text()}`); console.log(`PASS: ${label}`); return response; }
const login = await expect(await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30_000) }), 200, "Owner AI ERP login");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0]; if (!cookie) throw new Error("Login cookie missing.");
const response = await expect(await fetch(`${baseUrl}/api/owner-ai`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl, cookie }, body: JSON.stringify({ messages: [{ role: "user", content: "Give me the ERP order, inventory, warehouse, payment and fulfillment overview" }], mode: "OBSERVE", activeModule: "erphub" }), signal: AbortSignal.timeout(60_000) }), 200, "Owner AI authoritative ERP read");
const body = await response.json(); const call = body.toolCalls?.find((item) => item.name === "getErpOverview");
if (!call) throw new Error("Owner AI did not use getErpOverview.");
if (!call.resultPreview?.includes("orderStatus") || !call.resultPreview?.includes("inventory")) throw new Error("ERP tool did not return authoritative overview fields.");
if (/demo|synthetic/i.test(call.resultPreview)) throw new Error("ERP tool returned demo data.");
await expect(await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { origin: baseUrl, cookie } }), 204, "Owner AI ERP logout");
console.log("PASS: Owner AI uses canonical tenant ERP services");
