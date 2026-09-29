#!/usr/bin/env node

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;

if (!email || !password) {
  throw new Error("HAYDEV_TEST_EMAIL and HAYDEV_TEST_PASSWORD are required.");
}

async function expect(response, status, label) {
  if (response.status !== status) {
    throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  }
  console.log(`PASS: ${label} (${status})`);
  return response;
}

const login = await expect(await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email, password }),
  signal: AbortSignal.timeout(30_000),
}), 200, "Owner AI login");

const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not issue a session cookie.");

const response = await expect(await fetch(`${baseUrl}/api/owner-ai`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie, origin: baseUrl },
  body: JSON.stringify({
    messages: [{ role: "user", content: "find Persistent Lead" }],
    mode: "OBSERVE",
    activeModule: "leados",
  }),
  signal: AbortSignal.timeout(60_000),
}), 200, "Owner AI persistent LeadOS read");

const body = await response.json();
const searchCall = body.toolCalls?.find((call) => call.name === "searchGlobal");
if (!searchCall) throw new Error("Owner AI did not use the persistent LeadOS search adapter.");
if (!searchCall.resultPreview?.includes("Persistent Lead")) {
  throw new Error(`Owner AI search result did not contain a persisted tenant lead: ${JSON.stringify(searchCall)}`);
}
if (/demo|synthetic/i.test(searchCall.resultPreview)) {
  throw new Error("Owner AI returned demo or synthetic LeadOS data.");
}

await expect(await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { cookie, origin: baseUrl },
  signal: AbortSignal.timeout(30_000),
}), 204, "Owner AI logout");

console.log("PASS: Owner AI uses the canonical persistent LeadOS read path");
