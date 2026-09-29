#!/usr/bin/env node

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3105";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
if (!email || !password) throw new Error("HAYDEV_TEST_EMAIL and HAYDEV_TEST_PASSWORD are required");

async function expectStatus(response, status, label) {
  if (response.status !== status) throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  console.log(`PASS: ${label} (${status})`);
  return response;
}

const login = await expectStatus(await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email, password }),
}), 200, "Owner AI DocumentFlow login");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not issue a session cookie");

let response = await expectStatus(await fetch(`${baseUrl}/api/owner-ai`, {
  method: "POST", headers: { "content-type": "application/json", cookie, origin: baseUrl },
  body: JSON.stringify({ messages: [{ role: "user", content: "find Gate Five Upload" }], mode: "OBSERVE", activeModule: "docsmart" }),
  signal: AbortSignal.timeout(60_000),
}), 200, "Owner AI tenant document search");
let body = await response.json();
let call = body.toolCalls?.find((item) => item.name === "searchGlobal");
if (!call?.resultPreview?.includes("Gate Five Upload")) throw new Error("Owner AI did not return persisted tenant document metadata");
if (/storageKey|SUPABASE_SECRET/i.test(call.resultPreview)) throw new Error("Owner AI document result leaked Storage internals");

response = await expectStatus(await fetch(`${baseUrl}/api/owner-ai`, {
  method: "POST", headers: { "content-type": "application/json", cookie, origin: baseUrl },
  body: JSON.stringify({ messages: [{ role: "user", content: "show document summary" }], mode: "OBSERVE", activeModule: "docsmart" }),
  signal: AbortSignal.timeout(60_000),
}), 200, "Owner AI persisted document summary");
body = await response.json();
call = body.toolCalls?.find((item) => item.name === "getDocumentSummary");
if (!call || !call.resultPreview?.includes("total")) throw new Error("Owner AI did not use DocumentService summary");

await expectStatus(await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { cookie, origin: baseUrl } }), 204, "Owner AI DocumentFlow logout");
console.log("PASS: Owner AI document reads use canonical tenant DocumentService");
