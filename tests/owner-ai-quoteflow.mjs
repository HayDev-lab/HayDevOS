#!/usr/bin/env node

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
const quoteNumber = process.env.HAYDEV_TEST_QUOTE_NUMBER;
if (!email || !password || !quoteNumber) throw new Error("HAYDEV_TEST_EMAIL, HAYDEV_TEST_PASSWORD, and HAYDEV_TEST_QUOTE_NUMBER are required.");

async function expect(response, status, label) {
  if (response.status !== status) throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  console.log(`PASS: ${label} (${status})`);
  return response;
}

const login = await expect(await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30_000),
}), 200, "Owner AI QuoteFlow login");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not issue a session cookie.");

const response = await expect(await fetch(`${baseUrl}/api/owner-ai`, {
  method: "POST", headers: { "content-type": "application/json", cookie, origin: baseUrl },
  body: JSON.stringify({ messages: [{ role: "user", content: `find ${quoteNumber}` }], mode: "OBSERVE", activeModule: "quoteflow" }),
  signal: AbortSignal.timeout(60_000),
}), 200, "Owner AI persistent QuoteFlow search");
const body = await response.json();
const searchCall = body.toolCalls?.find((call) => call.name === "searchGlobal");
if (!searchCall) throw new Error("Owner AI did not use persistent global search.");
if (!searchCall.resultPreview?.includes(quoteNumber)) throw new Error("Owner AI search result did not contain the persisted tenant quote.");
if (/demo|synthetic/i.test(searchCall.resultPreview)) throw new Error("Owner AI returned demo or synthetic QuoteFlow data.");

await expect(await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { cookie, origin: baseUrl } }), 204, "Owner AI QuoteFlow logout");
console.log("PASS: Owner AI uses the canonical persistent QuoteFlow read path");
