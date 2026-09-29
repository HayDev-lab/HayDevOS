import { readFile } from "node:fs/promises";
import path from "node:path";

const credentialPath = path.resolve(process.env.HAYDEV_CREDENTIALS_FILE ?? ".tmp/haydev-role-credentials.json");
const credentials = JSON.parse(await readFile(credentialPath, "utf8"));
const baseUrl = (process.env.HAYDEV_APP_URL ?? credentials.applicationUrl ?? "https://haydevos.vercel.app").replace(/\/$/, "");
const productionCookie = new URL(baseUrl).protocol === "https:";
const results = [];
const roleFilter = process.env.HAYDEV_VERIFY_ROLE?.trim().toUpperCase();

for (const expected of credentials.users.filter((user) => !roleFilter || user.role === roleFilter)) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ email: expected.email, password: expected.password }),
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${expected.role} login failed with HTTP ${response.status}: ${payload?.error?.code ?? "UNKNOWN"}`);
  }
  if (payload?.session?.user?.role !== expected.role) {
    throw new Error(`${expected.role} login returned role ${payload?.session?.user?.role ?? "missing"}`);
  }
  if (payload?.session?.activeOrganization?.name !== credentials.organization.name) {
    throw new Error(`${expected.role} login returned the wrong organization`);
  }

  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  const expectedCookieName = productionCookie ? "__Host-haydev_session=" : "haydev_session=";
  const sessionCookie = setCookies.find((value) => value.startsWith(expectedCookieName));
  if (
    !sessionCookie ||
    !/;\s*HttpOnly/i.test(sessionCookie) ||
    !/;\s*SameSite=Strict/i.test(sessionCookie) ||
    (productionCookie && !/;\s*Secure/i.test(sessionCookie))
  ) {
    throw new Error(`${expected.role} login did not return the expected hardened session cookie`);
  }

  const cookie = sessionCookie.split(";", 1)[0];
  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Origin: baseUrl, Cookie: cookie },
    redirect: "manual",
    signal: AbortSignal.timeout(60_000),
  });
  if (logout.status !== 204) {
    const requestId = logout.headers.get("x-request-id") ?? "missing";
    const body = await logout.text().catch(() => "");
    throw new Error(`${expected.role} logout failed with HTTP ${logout.status} (requestId=${requestId}, body=${body.slice(0, 500)})`);
  }

  results.push({ email: expected.email, role: expected.role, organization: credentials.organization.name, login: 200, logout: 204 });
}

console.log(JSON.stringify({ baseUrl, verified: results.length, results }, null, 2));
