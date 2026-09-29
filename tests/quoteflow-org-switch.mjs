#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
const quoteId = process.env.HAYDEV_TEST_PERSISTED_QUOTE_ID;
const databaseUrl = process.env.DIRECT_URL;
if (!email || !password || !quoteId || !databaseUrl) throw new Error("Test credentials, persisted quote ID, and DIRECT_URL are required.");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const suffix = `${Date.now()}-${process.pid}`;
const orgId = `quote_switch_org_${suffix}`;
let cookie;

async function expect(response, status, label) {
  if (response.status !== status) throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  console.log(`PASS: ${label} (${status})`);
  return response;
}

try {
  const user = await db.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
  await db.organization.create({ data: { id: orgId, name: "Quote Switch Isolation", slug: `quote-switch-isolation-${suffix}` } });
  await db.membership.create({ data: { userId: user.id, orgId, role: "OWNER" } });
  await db.quoteSettings.create({ data: { orgId } });
  const login = await expect(await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email, password }) }), 200, "QuoteFlow org-switch login");
  cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  if (!cookie) throw new Error("Login did not issue a cookie.");
  const headers = { "content-type": "application/json", origin: baseUrl, cookie };
  await expect(await fetch(`${baseUrl}/api/auth/organization`, { method: "POST", headers, body: JSON.stringify({ orgId }) }), 200, "switch to empty QuoteFlow organization");
  const overview = await expect(await fetch(`${baseUrl}/api/quoteflow/overview`, { headers: { cookie } }), 200, "second-tenant QuoteFlow overview");
  if ((await overview.json()).quotes.length !== 0) throw new Error("Second tenant received cached or foreign quotes.");
  await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quoteId}`, { headers: { cookie } }), 404, "cross-tenant quote read denied after switch");
  const session = await expect(await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie } }), 200, "switched QuoteFlow session resolves");
  const originalOrgId = (await session.json()).session.organizations.find((org) => org.id !== orgId)?.id;
  if (!originalOrgId) throw new Error("Original organization is unavailable.");
  await expect(await fetch(`${baseUrl}/api/auth/organization`, { method: "POST", headers, body: JSON.stringify({ orgId: originalOrgId }) }), 200, "switch back to original QuoteFlow organization");
  await expect(await fetch(`${baseUrl}/api/quoteflow/quotes/${quoteId}`, { headers: { cookie } }), 200, "original tenant quote restored without cache bleed");
  await expect(await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers }), 204, "QuoteFlow org-switch logout");
  console.log("PASS: QuoteFlow organization switch isolation suite completed");
} finally {
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.$disconnect();
}
