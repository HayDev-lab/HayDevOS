#!/usr/bin/env node

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3105";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
const secondOrgId = process.env.HAYDEV_TEST_SECOND_ORG_ID;
if (!email || !password) throw new Error("HAYDEV_TEST_EMAIL and HAYDEV_TEST_PASSWORD are required");

async function expectStatus(response, status, label) {
  if (response.status !== status) throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  console.log(`PASS: ${label} (${status})`);
  return response;
}

await expectStatus(await fetch(`${baseUrl}/api/documents`), 401, "unauthenticated document list denied");
const login = await expectStatus(await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email, password }),
}), 200, "DocumentFlow login");
const session = await login.json();
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not issue a session cookie");
const jsonHeaders = { "content-type": "application/json", cookie, origin: baseUrl };
const cookieHeaders = { cookie };

await expectStatus(await fetch(`${baseUrl}/api/documents/upload`, { method: "POST", headers: jsonHeaders, body: "{}" }), 415, "non-multipart upload denied");
let form = new FormData();
form.append("file", new File([new Uint8Array([0x4d, 0x5a, 0x90])], "attack.pdf", { type: "application/pdf" }));
await expectStatus(await fetch(`${baseUrl}/api/documents/upload`, { method: "POST", headers: { cookie, origin: baseUrl }, body: form }), 415, "renamed executable rejected");

form = new FormData();
form.append("file", new File(["first"], "first.txt", { type: "text/plain" }));
form.append("file", new File(["second"], "second.txt", { type: "text/plain" }));
await expectStatus(await fetch(`${baseUrl}/api/documents/upload`, { method: "POST", headers: { cookie, origin: baseUrl }, body: form }), 422, "multiple files in one request rejected");

form = new FormData();
form.append("file", new File(["Gate 5 private upload\n"], "gate-five.txt", { type: "text/plain" }));
form.append("metadata", JSON.stringify({ title: "Gate Five Upload" }));
const uploadResponse = await fetch(`${baseUrl}/api/documents/upload`, { method: "POST", headers: { cookie, origin: baseUrl }, body: form });
let uploaded = null;
if (uploadResponse.status === 201) {
  console.log("PASS: private upload persisted (201)");
  uploaded = (await uploadResponse.json()).document;
  if (uploaded.status !== "PENDING_SCAN" || uploaded.scanStatus !== "PENDING_SCAN" || !/^[a-f0-9]{64}$/.test(uploaded.currentVersion?.sha256 ?? "")) {
    throw new Error(`Upload quarantine/integrity metadata invalid: ${JSON.stringify(uploaded)}`);
  }
  await expectStatus(await fetch(`${baseUrl}${`/api/documents/${uploaded.id}/download`}`, { headers: cookieHeaders, redirect: "manual" }), 423, "unscanned upload download denied");
} else if (uploadResponse.status === 503) {
  const body = await uploadResponse.json();
  if (body.error?.code !== "MALWARE_SCANNER_UNAVAILABLE") {
    throw new Error(`Unexpected upload failure: ${JSON.stringify(body)}`);
  }
  console.log("PASS: private upload fails closed when the malware scanner is unavailable (503)");
} else {
  throw new Error(`private upload persisted: expected 201 or fail-closed 503, received ${uploadResponse.status}: ${await uploadResponse.text()}`);
}

form = new FormData();
form.append("file", new File(["strict"], "strict.txt", { type: "text/plain" }));
form.append("metadata", JSON.stringify({ orgId: "attacker" }));
await expectStatus(await fetch(`${baseUrl}/api/documents/upload`, { method: "POST", headers: { cookie, origin: baseUrl }, body: form }), 422, "client tenant metadata rejected");

const suffix = `${Date.now()}-${process.pid}`;
const productResponse = await expectStatus(await fetch(`${baseUrl}/api/quoteflow/products`, {
  method: "POST", headers: jsonHeaders,
  body: JSON.stringify({ sku: `G5-${suffix}`, name: "Document Service", price: "100.00", currency: "USD", unit: "seat", active: true }),
}), 201, "QuoteFlow product created");
const product = (await productResponse.json()).product;
const quoteResponse = await expectStatus(await fetch(`${baseUrl}/api/quoteflow/quotes`, {
  method: "POST", headers: jsonHeaders,
  body: JSON.stringify({ customerName: "Gate Five Customer", currency: "USD", quoteDiscountType: "fixed", quoteDiscountValue: "10.00", taxRate: "20", taxIncluded: false, items: [{ productId: product.id, quantity: "2", discountType: "percent", discountValue: "5" }] }),
}), 201, "immutable quote created");
const quote = (await quoteResponse.json()).quote;

await expectStatus(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/document`, {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ versionId: quote.currentVersionId, format: "exe", locale: "en" }),
}), 422, "unsupported generated format rejected");

const generationRequests = await Promise.all(Array.from({ length: 8 }, () => fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/document`, {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ versionId: quote.currentVersionId, format: "pdf", locale: "hy" }),
})));
for (const response of generationRequests) {
  if (![201, 409].includes(response.status)) throw new Error(`Concurrent generation returned ${response.status}: ${await response.text()}`);
}
const successes = generationRequests.filter((response) => response.status === 201);
if (!successes.length) {
  const failures = await Promise.all(generationRequests.map(async (response) => ({ status: response.status, body: await response.text() })));
  throw new Error(`Concurrent generation produced no successful artifact: ${JSON.stringify(failures)}`);
}
const generated = (await successes[0].json()).document;
const successBodies = await Promise.all(successes.slice(1).map((response) => response.json()));
if (successBodies.some((body) => body.document.id !== generated.id)) throw new Error("Concurrent generation produced duplicate authoritative artifacts");
if (generated.snapshot.total !== quote.total || generated.snapshot.quoteVersionId !== quote.currentVersionId || generated.locale !== "hy") {
  throw new Error("PDF was not rendered from the authoritative immutable quote version");
}
console.log("PASS: eight-way generation race produced one idempotent artifact identity");

const retryResponse = await expectStatus(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/document`, {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ versionId: quote.currentVersionId, format: "pdf", locale: "hy" }),
}), 201, "generation retry is idempotent");
if ((await retryResponse.json()).document.id !== generated.id) throw new Error("Generation retry changed artifact identity");

const docxResponse = await expectStatus(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/document`, {
  method: "POST", headers: jsonHeaders, body: JSON.stringify({ versionId: quote.currentVersionId, format: "docx", locale: "ru" }),
}), 201, "DOCX generated from the same quote model");
const docx = (await docxResponse.json()).document;
if (docx.snapshot.total !== generated.snapshot.total || docx.snapshot.items[0].unitPrice !== generated.snapshot.items[0].unitPrice) {
  throw new Error("PDF and DOCX business values diverged");
}

const artifactsResponse = await expectStatus(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/documents`, { headers: cookieHeaders }), 200, "quote artifact history listed");
const artifacts = (await artifactsResponse.json()).documents;
if (artifacts.length !== 2 || new Set(artifacts.map((item) => item.documentVersionId)).size !== 2) throw new Error("Expected exactly two immutable quote artifacts");

const signedResponse = await expectStatus(await fetch(`${baseUrl}${generated.downloadPath}`, { headers: cookieHeaders, redirect: "manual" }), 302, "authorized download receives short-lived redirect");
const signedLocation = signedResponse.headers.get("location");
if (!signedLocation || signedLocation.includes("/object/public/")) throw new Error("Download did not use private signed access");
const pdf = await expectStatus(await fetch(signedLocation), 200, "signed private PDF downloaded");
if (Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString() !== "%PDF-") throw new Error("Downloaded PDF signature is invalid");

const listResponse = await expectStatus(await fetch(`${baseUrl}/api/documents?page=1&pageSize=100`, { headers: cookieHeaders }), 200, "tenant document list");
const list = await listResponse.json();
if ((uploaded && !list.items.some((item) => item.id === uploaded.id)) || !list.items.some((item) => item.id === generated.documentId) || list.items.some((item) => "storageKey" in item)) {
  throw new Error("Document list is incomplete or leaked a storage key");
}

console.log(`TEST_STORAGE_PREFIX=organizations/${session.session.activeOrganization.id}/documents`);
if (secondOrgId) {
  const switchResponse = await expectStatus(await fetch(`${baseUrl}/api/auth/organization`, {
    method: "POST", headers: jsonHeaders, body: JSON.stringify({ orgId: secondOrgId }),
  }), 200, "switch to second tenant");
  const tenantBCookie = switchResponse.headers.get("set-cookie")?.split(";", 1)[0] ?? cookie;
  const tenantBList = await expectStatus(await fetch(`${baseUrl}/api/documents?page=1&pageSize=100`, { headers: { cookie: tenantBCookie } }), 200, "second tenant document list");
  if ((await tenantBList.json()).total !== 0) throw new Error("Second tenant can see first tenant documents");
  if (uploaded) await expectStatus(await fetch(`${baseUrl}/api/documents/${uploaded.id}`, { headers: { cookie: tenantBCookie } }), 404, "cross-tenant document metadata denied");
  await expectStatus(await fetch(`${baseUrl}/api/documents/${generated.documentId}/download`, { headers: { cookie: tenantBCookie }, redirect: "manual" }), 404, "cross-tenant signed download denied");
  await expectStatus(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/document`, {
    method: "POST", headers: { "content-type": "application/json", cookie: tenantBCookie, origin: baseUrl }, body: JSON.stringify({ format: "pdf", locale: "en" }),
  }), 404, "cross-tenant quote generation denied");
}
console.log("PASS: DocumentFlow production HTTP suite completed");
