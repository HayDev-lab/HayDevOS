#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
const leadId = process.env.HAYDEV_TEST_PERSISTED_LEAD_ID;
const databaseUrl = process.env.DIRECT_URL;
if (!email || !password || !leadId || !databaseUrl) throw new Error("Test credentials, persisted lead ID, and DIRECT_URL are required.");

const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const suffix = `${Date.now()}-${process.pid}`;
const orgId = `switch_org_${suffix}`;
const pipelineId = `switch_pipeline_${suffix}`;
const stageId = `switch_stage_${suffix}`;
let cookie;

async function expect(response, status, label) {
  if (response.status !== status) throw new Error(`${label}: expected ${status}, received ${response.status}: ${await response.text()}`);
  console.log(`PASS: ${label} (${status})`);
  return response;
}

try {
  const user = await db.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
  await db.organization.create({ data: { id: orgId, name: "Switch Isolation", slug: `switch-isolation-${suffix}` } });
  await db.membership.create({ data: { userId: user.id, orgId, role: "OWNER" } });
  await db.leadPipeline.create({ data: { id: pipelineId, orgId, name: "Sales Pipeline", isDefault: true } });
  await db.leadPipelineStage.create({ data: { id: stageId, orgId, pipelineId, key: "new", name: "New", position: 0 } });
  await db.leadSlaPolicy.create({ data: { orgId } });

  const login = await expect(await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json", origin: baseUrl }, body: JSON.stringify({ email, password }),
  }), 200, "org-switch login");
  cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
  if (!cookie) throw new Error("Login did not issue a cookie.");
  const headers = { "content-type": "application/json", origin: baseUrl, cookie };

  await expect(await fetch(`${baseUrl}/api/auth/organization`, { method: "POST", headers, body: JSON.stringify({ orgId }) }), 200, "switch to second organization");
  const emptyOverview = await expect(await fetch(`${baseUrl}/api/leados/overview`, { headers: { cookie } }), 200, "second-tenant overview");
  if ((await emptyOverview.json()).overview.dashboard.totalLeads !== 0) throw new Error("Second tenant received cached or foreign leads.");
  await expect(await fetch(`${baseUrl}/api/leados/leads/${leadId}`, { headers: { cookie } }), 404, "cross-tenant lead read denied after switch");

  const session = await expect(await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie } }), 200, "switched session resolves");
  const sessionBody = await session.json();
  const originalOrgId = sessionBody.session.organizations.find((org) => org.id !== orgId)?.id;
  if (!originalOrgId) throw new Error("Original organization is unavailable.");
  await expect(await fetch(`${baseUrl}/api/auth/organization`, { method: "POST", headers, body: JSON.stringify({ orgId: originalOrgId }) }), 200, "switch back to original organization");
  await expect(await fetch(`${baseUrl}/api/leados/leads/${leadId}`, { headers: { cookie } }), 200, "original tenant lead restored without cache bleed");
  await expect(await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers }), 204, "org-switch logout");
  console.log("PASS: organization switch isolation suite completed");
} finally {
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.$disconnect();
}
