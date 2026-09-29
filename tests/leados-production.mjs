#!/usr/bin/env node

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;
const verifyLeadId = process.env.HAYDEV_TEST_VERIFY_LEAD_ID;

if (!email || !password) throw new Error("HAYDEV_TEST_EMAIL and HAYDEV_TEST_PASSWORD are required.");

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
}), 200, "LeadOS login");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not issue a session cookie.");

const headers = { "content-type": "application/json", cookie, origin: baseUrl };

if (verifyLeadId) {
  const persisted = await expect(await fetch(`${baseUrl}/api/leados/leads/${encodeURIComponent(verifyLeadId)}`, { headers: { cookie } }), 200, "lead survives server restart");
  const body = await persisted.json();
  if (body.lead?.id !== verifyLeadId) throw new Error("Restart persistence returned the wrong lead.");
  process.exit(0);
}

const overviewResponse = await expect(await fetch(`${baseUrl}/api/leados/overview`, { headers: { cookie } }), 200, "tenant LeadOS overview");
const overview = (await overviewResponse.json()).overview;
const stage = overview.pipelines.flatMap((pipeline) => pipeline.stages).find((item) => item.key === "qualified");
if (!stage || !overview.slaPolicy) throw new Error("Overview is missing persisted pipeline or SLA configuration.");

await expect(await fetch(`${baseUrl}/api/leados/leads`, {
  method: "POST",
  headers,
  body: JSON.stringify({ name: "Spoofed tenant", source: "web", orgId: "attacker-org" }),
}), 422, "client organization field rejected");

const suffix = `${Date.now()}-${process.pid}`;
const createdResponse = await expect(await fetch(`${baseUrl}/api/leados/leads`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    name: `Persistent Lead ${suffix}`,
    email: `persistent-${suffix}@example.invalid`,
    phone: `+374 91 ${String(Date.now()).slice(-6)}`,
    company: "Gate Three",
    source: "web",
    externalId: `restart-${suffix}`,
    value: "12500.50",
    currency: "USD",
  }),
}), 201, "lead creation through domain API");
const created = (await createdResponse.json()).lead;
console.log(`PERSISTED_LEAD_ID=${created.id}`);

await expect(await fetch(`${baseUrl}/api/leados/leads`, {
  method: "POST",
  headers,
  body: JSON.stringify({ name: "Duplicate", email: created.email, source: "referral" }),
}), 409, "tenant-aware normalized email dedup");

const search = await expect(await fetch(`${baseUrl}/api/leados/leads?q=${encodeURIComponent(created.externalId)}&stage=new&source=web&page=1&limit=1&sort=value&direction=desc`, { headers: { cookie } }), 200, "server search filters sort and pagination");
const searchBody = await search.json();
if (searchBody.total !== 1 || searchBody.items[0]?.id !== created.id) throw new Error("Server-side lead query returned an unexpected record.");

await expect(await fetch(`${baseUrl}/api/leados/leads/${created.id}/stage`, {
  method: "POST", headers, body: JSON.stringify({ stageId: stage.id, pipelineId: stage.pipelineId }),
}), 200, "tenant-safe stage transition");

await expect(await fetch(`${baseUrl}/api/leados/leads/${created.id}/notes`, {
  method: "POST", headers, body: JSON.stringify({ body: "Persisted internal note" }),
}), 201, "lead note persistence");

const taskResponse = await expect(await fetch(`${baseUrl}/api/leados/leads/${created.id}/tasks`, {
  method: "POST",
  headers,
  body: JSON.stringify({ title: "Follow up", type: "FOLLOW_UP", priority: "high", dueAt: new Date(Date.now() + 3_600_000).toISOString() }),
}), 201, "lead task persistence");
const task = (await taskResponse.json()).task;
await expect(await fetch(`${baseUrl}/api/leados/tasks/${task.id}/complete`, {
  method: "POST", headers, body: JSON.stringify({ completed: true }),
}), 200, "task completion persistence");

const activities = await expect(await fetch(`${baseUrl}/api/leados/activities?leadId=${created.id}&page=1&limit=2`, { headers: { cookie } }), 200, "activity pagination");
if ((await activities.json()).total < 4) throw new Error("Expected persisted lead activity events.");

const tasks = await expect(await fetch(`${baseUrl}/api/leados/tasks?leadId=${created.id}&status=done&page=1&limit=10`, { headers: { cookie } }), 200, "task filtering");
if ((await tasks.json()).total !== 1) throw new Error("Completed task filter returned an unexpected result.");

await expect(await fetch(`${baseUrl}/api/leados/settings`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({ firstResponseMinutes: 180, warningMinutes: 45, followUpMinutes: 1440, stageInactivityMinutes: 4320 }),
}), 200, "database-backed SLA update");

const ingestBody = {
  provider: "gate3-test",
  eventId: `evt-${suffix}`,
  lead: { name: `Webhook Lead ${suffix}`, email: `webhook-${suffix}@example.invalid`, source: "inbound" },
};
const firstIngest = await expect(await fetch(`${baseUrl}/api/leados/ingest`, { method: "POST", headers, body: JSON.stringify(ingestBody) }), 201, "first webhook ingestion");
const firstIngestBody = await firstIngest.json();
const replay = await expect(await fetch(`${baseUrl}/api/leados/ingest`, { method: "POST", headers, body: JSON.stringify(ingestBody) }), 200, "webhook replay");
const replayBody = await replay.json();
if (!replayBody.replayed || replayBody.lead?.id !== firstIngestBody.lead?.id) throw new Error("Webhook replay did not return the original lead.");

const detail = await expect(await fetch(`${baseUrl}/api/leados/leads/${created.id}`, { headers: { cookie } }), 200, "lead detail reload");
const detailBody = await detail.json();
if (detailBody.lead.stage !== "qualified" || detailBody.lead.notes.length !== 1 || detailBody.lead.tasks[0]?.status !== "done") {
  throw new Error("Lead detail did not reflect persisted stage, note, and task state.");
}

await expect(await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers }), 204, "LeadOS logout");
console.log("PASS: LeadOS production HTTP suite completed");
