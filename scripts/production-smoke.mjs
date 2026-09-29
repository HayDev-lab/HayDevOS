#!/usr/bin/env node

const rawBaseUrl = process.env.BASE_URL?.trim();
if (!rawBaseUrl) throw new Error("BASE_URL is required");
const base = new URL(rawBaseUrl);
const localHttpAllowed = process.env.ALLOW_HTTP_LOCALHOST === "1" && ["127.0.0.1", "localhost"].includes(base.hostname);
if (base.protocol !== "https:" && !localHttpAllowed) {
  throw new Error("BASE_URL must use HTTPS (HTTP is allowed only for localhost with ALLOW_HTTP_LOCALHOST=1)");
}
const baseUrl = base.origin;

function pass(label) {
  console.log(`PASS: ${label}`);
}

async function expectStatus(responsePromise, expected, label) {
  const response = await responsePromise;
  if (!expected.includes(response.status)) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`${label}: expected ${expected.join("/")}, received ${response.status}: ${body}`);
  }
  pass(`${label} (${response.status})`);
  return response;
}

const health = await expectStatus(fetch(`${baseUrl}/api/health`, { redirect: "manual" }), [200], "liveness");
const healthBody = await health.json();
if (healthBody.status !== "ok") throw new Error("Liveness response was not healthy");

const ready = await expectStatus(fetch(`${baseUrl}/api/ready`, { redirect: "manual" }), [200], "readiness");
const readyBody = await ready.json();
if (readyBody.status !== "ready" || !readyBody.checks?.database || !readyBody.checks?.storage || !readyBody.checks?.scanner) {
  throw new Error("Readiness dependencies were not all green");
}

const page = await expectStatus(fetch(`${baseUrl}/`, { redirect: "manual" }), [200], "application root");
const requiredHeaders = {
  "strict-transport-security": /max-age=/i,
  "content-security-policy": /default-src 'self'/i,
  "x-content-type-options": /^nosniff$/i,
  "x-frame-options": /^DENY$/i,
  "referrer-policy": /strict-origin/i,
};
for (const [name, pattern] of Object.entries(requiredHeaders)) {
  const value = page.headers.get(name) ?? "";
  if (!pattern.test(value)) throw new Error(`Required response header is missing or invalid: ${name}`);
}
pass("security headers");

await expectStatus(fetch(`${baseUrl}/api/documents`), [401], "unauthenticated tenant data denied");
const dummyLogin = { email: "smoke-invalid@example.invalid", password: "not-a-real-password" };
await expectStatus(fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(dummyLogin),
}), [403], "missing Origin rejected");
await expectStatus(fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://attacker.invalid" },
  body: JSON.stringify(dummyLogin),
}), [403], "foreign Origin rejected");

const email = process.env.PRODUCTION_SMOKE_EMAIL?.trim();
const password = process.env.PRODUCTION_SMOKE_PASSWORD;
if (!email && !password) {
  console.log("SKIP: authenticated and mutation suites (PRODUCTION_SMOKE_EMAIL/PASSWORD not configured)");
  process.exit(0);
}
if (!email || !password) throw new Error("PRODUCTION_SMOKE_EMAIL and PRODUCTION_SMOKE_PASSWORD must be provided together");

const login = await expectStatus(fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email, password }),
}), [200], "production login");
const loginBody = await login.json();
const setCookie = login.headers.get("set-cookie") ?? "";
for (const marker of ["__Host-haydev_session=", "HttpOnly", "Secure", "SameSite=Strict", "Path=/"]) {
  if (!setCookie.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Session cookie is missing ${marker}`);
}
if (/;\s*Domain=/i.test(setCookie)) throw new Error("__Host- session cookie must not set Domain");
const cookie = setCookie.split(";", 1)[0];
const session = loginBody.session;
if (!session?.activeOrganization?.id) throw new Error("Login response did not resolve an active tenant");
if (process.env.PRODUCTION_SMOKE_ORG_SLUG && session.activeOrganization.slug !== process.env.PRODUCTION_SMOKE_ORG_SLUG) {
  throw new Error("Smoke credentials are not attached to the dedicated smoke tenant");
}
pass("secure host-only session cookie");

const authHeaders = { cookie };
const mutationHeaders = { cookie, origin: baseUrl, "content-type": "application/json" };
for (const [path, label] of [
  ["/api/auth/session", "session resolution"],
  ["/api/leados/leads?page=1&limit=1", "LeadOS read"],
  ["/api/quoteflow/quotes?page=1&limit=1", "QuoteFlow read"],
  ["/api/documents?page=1&pageSize=1", "DocumentFlow read"],
  ["/api/erp/overview", "ERP read"],
]) {
  await expectStatus(fetch(`${baseUrl}${path}`, { headers: authHeaders }), [200], label);
}

await expectStatus(fetch(`${baseUrl}/api/leados/leads`, {
  method: "POST",
  headers: { cookie, "content-type": "application/json" },
  body: "{}",
}), [403], "authenticated mutation without Origin rejected");
await expectStatus(fetch(`${baseUrl}/api/leados/leads`, {
  method: "POST",
  headers: { cookie, origin: "https://attacker.invalid", "content-type": "application/json" },
  body: "{}",
}), [403], "authenticated mutation from foreign Origin rejected");

if (process.env.PRODUCTION_SMOKE_CROSS_TENANT_LEAD_ID) {
  await expectStatus(fetch(`${baseUrl}/api/leados/leads/${encodeURIComponent(process.env.PRODUCTION_SMOKE_CROSS_TENANT_LEAD_ID)}`, {
    headers: { ...authHeaders, "x-organization-id": "attacker-controlled" },
  }), [404], "cross-tenant lead lookup hidden");
} else {
  console.log("SKIP: cross-tenant object probe (PRODUCTION_SMOKE_CROSS_TENANT_LEAD_ID not configured)");
}

if (process.env.PRODUCTION_SMOKE_ALLOW_UPLOADS === "1") {
  if (!process.env.PRODUCTION_SMOKE_ORG_SLUG) {
    throw new Error("PRODUCTION_SMOKE_ORG_SLUG is required before mutation smoke tests");
  }
  const suffix = `${Date.now()}-${process.pid}`;
  const cleanTitle = `[PROD-SMOKE] clean ${suffix}`;
  const cleanForm = new FormData();
  cleanForm.append("file", new File(["HayDevOS production malware scanner smoke\n"], `clean-${suffix}.txt`, { type: "text/plain" }));
  cleanForm.append("metadata", JSON.stringify({ title: cleanTitle }));
  const cleanResponse = await expectStatus(fetch(`${baseUrl}/api/documents/upload`, {
    method: "POST", headers: { cookie, origin: baseUrl }, body: cleanForm,
  }), [201], "clean upload accepted after malware scan");
  const cleanDocument = (await cleanResponse.json()).document;
  if (cleanDocument.status !== "ACTIVE" || cleanDocument.scanStatus !== "CLEAN") {
    throw new Error("Clean upload was not activated by a trusted malware verdict");
  }
  await expectStatus(fetch(`${baseUrl}/api/documents/${cleanDocument.id}/download`, {
    headers: authHeaders, redirect: "manual",
  }), [302], "clean document receives signed access");
  await expectStatus(fetch(`${baseUrl}/api/documents/${cleanDocument.id}/archive`, {
    method: "POST", headers: mutationHeaders, body: "{}",
  }), [200], "clean smoke document archived");

  const eicar = ["X5O!P%@AP[4", String.fromCharCode(92), "PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join("");
  const infectedTitle = `[PROD-SMOKE] EICAR ${suffix}`;
  const infectedForm = new FormData();
  infectedForm.append("file", new File([eicar], `eicar-${suffix}.txt`, { type: "text/plain" }));
  infectedForm.append("metadata", JSON.stringify({ title: infectedTitle }));
  await expectStatus(fetch(`${baseUrl}/api/documents/upload`, {
    method: "POST", headers: { cookie, origin: baseUrl }, body: infectedForm,
  }), [422], "EICAR test artifact blocked");

  const documents = await (await expectStatus(fetch(`${baseUrl}/api/documents?page=1&pageSize=100`, { headers: authHeaders }), [200], "malware quarantine verification")).json();
  const rejected = documents.items.find((item) => item.title === infectedTitle);
  if (!rejected || rejected.status !== "REJECTED" || rejected.scanStatus !== "INFECTED") {
    throw new Error("EICAR record was not retained as rejected/quarantined");
  }
  await expectStatus(fetch(`${baseUrl}/api/documents/${rejected.id}/download`, { headers: authHeaders, redirect: "manual" }), [423], "infected download denied");
  await expectStatus(fetch(`${baseUrl}/api/documents/${rejected.id}/archive`, {
    method: "POST", headers: mutationHeaders, body: "{}",
  }), [200], "infected smoke record archived");
}

if (process.env.PRODUCTION_SMOKE_ALLOW_AI === "1") {
  await expectStatus(fetch(`${baseUrl}/api/owner-ai`, {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify({
      messages: [{ role: "user", content: "Reply with a one-sentence production health acknowledgement. Do not propose or execute actions." }],
      mode: "OBSERVE",
      activeModule: "dashboard",
    }),
  }), [200], "Owner AI provider round trip");
}

await expectStatus(fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST", headers: mutationHeaders, body: "{}",
}), [204], "logout");
await expectStatus(fetch(`${baseUrl}/api/auth/session`, { headers: authHeaders }), [401], "revoked session rejected");
pass("production-safe smoke suite completed");
