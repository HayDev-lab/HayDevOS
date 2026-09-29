import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const EXPECTED_ROLE = "haydev_runtime";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function decodeCredential(value, label) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(`${label} contains invalid percent-encoding`);
  }
}

function projectRef(username) {
  const separator = username.indexOf(".");
  return separator === -1 ? "" : username.slice(separator + 1);
}

const directUrl = new URL(required("DIRECT_URL"));
const runtimeUrl = new URL(required("DATABASE_URL"));
const directUsername = decodeCredential(directUrl.username, "DIRECT_URL username");
const runtimeUsername = decodeCredential(runtimeUrl.username, "DATABASE_URL username");
const runtimeRole = runtimeUsername.split(".", 1)[0];
const runtimePassword = decodeCredential(runtimeUrl.password, "DATABASE_URL password");

if (process.env.CONFIRM_RUNTIME_PASSWORD_SYNC !== EXPECTED_ROLE) {
  throw new Error(`Set CONFIRM_RUNTIME_PASSWORD_SYNC=${EXPECTED_ROLE} to run this operation`);
}
if (directUrl.protocol !== "postgresql:" || runtimeUrl.protocol !== "postgresql:") {
  throw new Error("DIRECT_URL and DATABASE_URL must use postgresql://");
}
if (runtimeRole !== EXPECTED_ROLE) {
  throw new Error(`DATABASE_URL must target ${EXPECTED_ROLE}`);
}
if (!directUsername.startsWith("postgres.")) {
  throw new Error("DIRECT_URL must use the Supabase postgres owner role");
}
if (!projectRef(directUsername) || projectRef(directUsername) !== projectRef(runtimeUsername)) {
  throw new Error("DIRECT_URL and DATABASE_URL must target the same Supabase project");
}
if (directUrl.hostname !== runtimeUrl.hostname || directUrl.pathname !== runtimeUrl.pathname) {
  throw new Error("DIRECT_URL and DATABASE_URL must target the same database host and name");
}
if (runtimePassword.length < 15) {
  throw new Error("The runtime role password is too short");
}

process.env.DATABASE_URL = directUrl.toString();
const ownerDb = new PrismaClient();

try {
  const roles = await ownerDb.$queryRawUnsafe(
    `SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolinherit, rolconfig
       FROM pg_roles
      WHERE rolname = '${EXPECTED_ROLE}'`,
  );
  const role = roles[0];
  if (!role) throw new Error(`${EXPECTED_ROLE} does not exist`);
  if (role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.rolbypassrls || role.rolinherit) {
    throw new Error(`${EXPECTED_ROLE} has unsafe role attributes; password was not changed`);
  }
  console.log(JSON.stringify({
    preflight: "ok",
    role: EXPECTED_ROLE,
    roleSettings: role.rolconfig ?? [],
    elevatedPrivileges: false,
  }));

  const escapedPassword = runtimePassword.replaceAll("'", "''");
  await ownerDb.$executeRawUnsafe(
    `ALTER ROLE ${EXPECTED_ROLE} LOGIN PASSWORD '${escapedPassword}'`,
  );
} finally {
  await ownerDb.$disconnect();
}

// The role already has a locked-down public search_path. Passing Prisma's
// `schema` URL option through Supabase transaction pooling causes an invalid
// startup SET statement for this custom role, so do not duplicate it here.
runtimeUrl.searchParams.delete("schema");
process.env.DATABASE_URL = runtimeUrl.toString();
const runtimeDb = new PrismaClient();

try {
  const rows = await runtimeDb.$queryRawUnsafe("SELECT current_user");
  if (rows[0]?.current_user !== EXPECTED_ROLE) {
    throw new Error("Runtime connection did not authenticate as the expected role");
  }
  console.log(JSON.stringify({
    status: "ok",
    role: EXPECTED_ROLE,
    authenticated: true,
    elevatedPrivileges: false,
  }));
} finally {
  await runtimeDb.$disconnect();
}
