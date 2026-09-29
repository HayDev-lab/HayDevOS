#!/usr/bin/env node

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
const verifyQuoteId = process.env.HAYDEV_TEST_VERIFY_QUOTE_ID;
if (!email || !password) throw new Error("HAYDEV_TEST_EMAIL and HAYDEV_TEST_PASSWORD are required.");

async function expect(response, status, label) {
  if (response.status !== status) throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  console.log(`PASS: ${label} (${status})`);
  return response;
}

const login = await expect(await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email, password }),
}), 200, "QuoteFlow login");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not issue a session cookie.");
const headers = { "content-type": "application/json", cookie, origin: baseUrl };

if (verifyQuoteId) {
  const response = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${encodeURIComponent(verifyQuoteId)}`, { headers: { cookie } }), 200, "quote survives server restart");
  if ((await response.json()).quote?.id !== verifyQuoteId) throw new Error("Restart persistence returned the wrong quote.");
  process.exit(0);
}

await expect(await fetch(`${baseUrl}/api/quoteflow/overview`, { headers: { cookie } }), 200, "tenant QuoteFlow overview");
await expect(await fetch(`${baseUrl}/api/quoteflow/settings`, { method: "PATCH", headers, body: JSON.stringify({ defaultTaxRate: "20", approvalRequired: true }) }), 200, "persisted quote settings");

const suffix = `${Date.now()}-${process.pid}`;
const productResponse = await expect(await fetch(`${baseUrl}/api/quoteflow/products`, {
  method: "POST", headers, body: JSON.stringify({ sku: `G4-${suffix}`, name: `Gate Four Service ${suffix}`, price: "19.995", currency: "USD", unit: "seat", active: true }),
}), 201, "catalog product persistence");
const product = (await productResponse.json()).product;

const baseQuote = {
  customerName: `Gate Four Customer ${suffix}`, currency: "USD", quoteDiscountType: "percent", quoteDiscountValue: "10",
  taxRate: "20", taxIncluded: false,
  items: [{ productId: product.id, quantity: "2", discountType: "percent", discountValue: "0" }],
};
await expect(await fetch(`${baseUrl}/api/quoteflow/quotes`, { method: "POST", headers, body: JSON.stringify({ ...baseQuote, orgId: "attacker", total: "0.01" }) }), 422, "client tenant and calculated totals rejected");

const createdResponse = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes`, { method: "POST", headers, body: JSON.stringify(baseQuote) }), 201, "quote creation through canonical API");
let quote = (await createdResponse.json()).quote;
console.log(`PERSISTED_QUOTE_ID=${quote.id}`);
console.log(`PERSISTED_QUOTE_NUMBER=${quote.number}`);
if (quote.total !== "43.20" || quote.subtotal !== "40.00" || quote.tax !== "7.20" || quote.currentVersionNumber !== 1) throw new Error(`Unexpected authoritative price/version: ${JSON.stringify(quote)}`);

const concurrent = await Promise.all(Array.from({ length: 8 }, (_, index) => fetch(`${baseUrl}/api/quoteflow/quotes`, {
  method: "POST", headers, body: JSON.stringify({ ...baseQuote, customerName: `${baseQuote.customerName} concurrent ${index}`, quoteDiscountValue: "0" }),
})));
for (const [index, response] of concurrent.entries()) await expect(response, 201, `concurrent quote ${index + 1}`);
const concurrentNumbers = (await Promise.all(concurrent.map((response) => response.json()))).map((body) => body.quote.number);
if (new Set(concurrentNumbers).size !== concurrentNumbers.length || concurrentNumbers.includes(quote.number)) throw new Error("Atomic quote numbering produced duplicates.");
console.log("PASS: race-safe quote numbering is unique");

const search = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes?q=${encodeURIComponent(quote.number)}&status=draft&currency=USD&page=1&limit=1&sort=total&direction=desc`, { headers: { cookie } }), 200, "server search filters sort and pagination");
if ((await search.json()).items[0]?.id !== quote.id) throw new Error("Quote search returned an unexpected result.");

const staleRevision = quote.revision;
const revised = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}`, { method: "PATCH", headers, body: JSON.stringify({ expectedRevision: quote.revision, notes: "Persisted revision two" }) }), 200, "optimistic update creates new version");
quote = (await revised.json()).quote;
if (quote.currentVersionNumber !== 2 || quote.revision !== staleRevision + 1) throw new Error("Revision/version did not advance.");
await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}`, { method: "PATCH", headers, body: JSON.stringify({ expectedRevision: staleRevision, notes: "stale write" }) }), 409, "stale optimistic write rejected");

let response = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/submit`, { method: "POST", headers, body: JSON.stringify({ expectedRevision: quote.revision, reason: "Gate four approval" }) }), 200, "version submitted for approval");
quote = (await response.json()).quote;
response = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/approve`, { method: "POST", headers, body: JSON.stringify({ expectedRevision: quote.revision, reason: "Approved" }) }), 200, "current immutable version approved");
quote = (await response.json()).quote;

const versionsResponse = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/versions`, { headers: { cookie } }), 200, "version and approval history");
let versions = (await versionsResponse.json()).versions;
if (versions.length !== 2 || versions[0].id !== quote.currentVersionId || versions[0].approvals[0]?.status !== "approved") throw new Error("Approval is not bound to the current immutable version.");

const approvedVersionId = quote.currentVersionId;
response = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}`, { method: "PATCH", headers, body: JSON.stringify({ expectedRevision: quote.revision, notes: "Revision after approval" }) }), 200, "approved quote revision creates a new draft version");
quote = (await response.json()).quote;
if (quote.currentVersionId === approvedVersionId || quote.currentVersionNumber !== 3 || quote.status !== "draft") throw new Error("Approved revision did not create a new unapproved draft version.");
await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/send`, { method: "POST", headers, body: JSON.stringify({ expectedRevision: quote.revision }) }), 409, "old version approval cannot authorize new version");
response = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/submit`, { method: "POST", headers, body: JSON.stringify({ expectedRevision: quote.revision, reason: "Approve version three" }) }), 200, "new version submitted independently");
quote = (await response.json()).quote;
response = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/approve`, { method: "POST", headers, body: JSON.stringify({ expectedRevision: quote.revision, reason: "Version three approved" }) }), 200, "new version approved independently");
quote = (await response.json()).quote;
versions = (await (await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/versions`, { headers: { cookie } }), 200, "independent approval history after revision")).json()).versions;
if (versions.length !== 3 || versions[0].approvals[0]?.status !== "approved" || versions[1].approvals[0]?.status !== "approved") throw new Error("Version-bound approval history is incomplete.");

const documentResponse = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/document`, { method: "POST", headers, body: JSON.stringify({ versionId: quote.currentVersionId, format: "json" }) }), 201, "document snapshot generated from version");
const document = (await documentResponse.json()).document;
if (document.snapshot.total !== quote.total || !/^[a-f0-9]{64}$/.test(document.contentHash)) throw new Error("Document snapshot/hash is invalid.");
await expect(await fetch(`${baseUrl}/api/quoteflow/products/${product.id}`, { method: "PATCH", headers, body: JSON.stringify({ price: "999.99" }) }), 200, "catalog price changed after snapshot");
versions = (await (await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/versions`, { headers: { cookie } }), 200, "version snapshot after catalog change")).json()).versions;
if (versions[0].itemsSnapshot[0]?.unitPrice !== "20.00" || versions[0].total !== quote.total) throw new Error("Catalog mutation changed the immutable item/price snapshot.");

response = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/send`, { method: "POST", headers, body: JSON.stringify({ expectedRevision: quote.revision }) }), 200, "approved version sent");
quote = (await response.json()).quote;
response = await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}/accept`, { method: "POST", headers, body: JSON.stringify({ expectedRevision: quote.revision, reason: "Client accepted" }) }), 200, "sent approved version accepted");
quote = (await response.json()).quote;
if (quote.acceptedVersionId !== quote.currentVersionId) throw new Error("Accepted version binding is incorrect.");
await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}`, { method: "PATCH", headers, body: JSON.stringify({ expectedRevision: quote.revision, notes: "forbidden mutation" }) }), 409, "accepted quote is immutable");
await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quote.id}`, { method: "DELETE", headers, body: JSON.stringify({ expectedRevision: quote.revision }) }), 409, "accepted quote cannot be archived through the API");

await expect(await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers }), 204, "QuoteFlow logout");
console.log("PASS: QuoteFlow production HTTP suite completed");
