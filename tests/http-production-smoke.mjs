#!/usr/bin/env node

const baseUrl = process.env.HAYDEV_TEST_BASE_URL || "http://127.0.0.1:3100";
const email = process.env.HAYDEV_TEST_EMAIL;
const password = process.env.HAYDEV_TEST_PASSWORD;

if (!email || !password) {
  throw new Error("HAYDEV_TEST_EMAIL and HAYDEV_TEST_PASSWORD are required.");
}

async function expectStatus(label, response, expected) {
  if (response.status !== expected) {
    const body = await response.text();
    throw new Error(`${label}: expected ${expected}, received ${response.status}: ${body}`);
  }
  console.log(`PASS: ${label} (${expected})`);
}

const root = await fetch(`${baseUrl}/`);
await expectStatus("production root", root, 200);

const anonymous = await fetch(`${baseUrl}/api/auth/session`);
await expectStatus("anonymous session denied", anonymous, 401);

const badOrigin = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://evil.example" },
  body: JSON.stringify({ email, password }),
});
await expectStatus("cross-origin login denied", badOrigin, 403);

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email, password }),
});
await expectStatus("valid login", login, 200);
const loginBody = await login.json();
if (!loginBody.session?.user?.id || !loginBody.session?.activeOrganization?.id) {
  throw new Error("Login response is missing the persisted user/organization context.");
}

const setCookie = login.headers.get("set-cookie");
const cookie = setCookie?.split(";", 1)[0];
if (!cookie || !/HttpOnly/i.test(setCookie) || !/SameSite=Strict/i.test(setCookie)) {
  throw new Error("Login did not return the required opaque session cookie flags.");
}
console.log("PASS: opaque HttpOnly SameSite=Strict cookie issued");

const session = await fetch(`${baseUrl}/api/auth/session`, {
  headers: { cookie },
});
await expectStatus("persisted session resolved", session, 200);
const sessionBody = await session.json();
if (
  sessionBody.session?.activeOrganization?.id !==
  loginBody.session.activeOrganization.id
) {
  throw new Error("Resolved session organization differs from login context.");
}

const invalidSwitch = await fetch(`${baseUrl}/api/auth/organization`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    cookie,
    origin: baseUrl,
  },
  body: JSON.stringify({ orgId: "not-a-membership" }),
});
await expectStatus("non-member organization switch denied", invalidSwitch, 404);

const ownerAiState = await fetch(`${baseUrl}/api/owner-ai/state`, {
  headers: { cookie },
});
await expectStatus("tenant Owner AI state", ownerAiState, 200);
const ownerAiBody = await ownerAiState.json();
if (!Array.isArray(ownerAiBody.conversations) || !Array.isArray(ownerAiBody.approvals)) {
  throw new Error("Owner AI state response is missing persisted collections.");
}

const logout = await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { cookie, origin: baseUrl },
});
await expectStatus("logout", logout, 204);

const revoked = await fetch(`${baseUrl}/api/auth/session`, {
  headers: { cookie },
});
await expectStatus("logged-out session rejected", revoked, 401);

console.log("PASS: production HTTP authentication/tenant smoke suite completed");
