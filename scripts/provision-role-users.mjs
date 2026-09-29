import { randomBytes, scryptSync } from "node:crypto";
import { mkdir, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];
const ROLE_NAMES = {
  OWNER: "HayDev Owner",
  ADMIN: "HayDev Administrator",
  MANAGER: "HayDev Manager",
  MEMBER: "HayDev Member",
  VIEWER: "HayDev Viewer",
};
const leadStages = [
  { key: "new", name: "New", position: 0, isClosed: false, isWon: false, color: "cyan" },
  { key: "contacted", name: "Contacted", position: 1, isClosed: false, isWon: false, color: "muted" },
  { key: "qualified", name: "Qualified", position: 2, isClosed: false, isWon: false, color: "lime" },
  { key: "proposal", name: "Proposal", position: 3, isClosed: false, isWon: false, color: "amber" },
  { key: "negotiation", name: "Negotiation", position: 4, isClosed: false, isWon: false, color: "violet" },
  { key: "won", name: "Won", position: 5, isClosed: true, isWon: true, color: "success" },
  { key: "lost", name: "Lost", position: 6, isClosed: true, isWon: false, color: "rose" },
];

const ownerEmail = requireEnv("HAYDEV_PROVISION_OWNER_EMAIL").toLowerCase();
const organizationName = requireEnv("HAYDEV_PROVISION_ORG_NAME");
const organizationSlug = (process.env.HAYDEV_PROVISION_ORG_SLUG ?? slugify(organizationName)).trim().toLowerCase();
const outputPath = path.resolve(process.env.HAYDEV_CREDENTIALS_FILE ?? ".tmp/haydev-role-credentials.json");
const applicationUrl = (process.env.HAYDEV_APP_URL ?? "https://haydevos.vercel.app").replace(/\/$/, "");
const mode = process.argv.includes("--apply") ? "apply" : "preflight";

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
  throw new Error("HAYDEV_PROVISION_OWNER_EMAIL must be a valid email address");
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationSlug)) {
  throw new Error("HAYDEV_PROVISION_ORG_SLUG must be a lowercase URL slug");
}

const targetUsers = buildUsers(ownerEmail);
const db = new PrismaClient();

try {
  const state = await readState();
  console.log(JSON.stringify({
    mode,
    databaseUser: state.databaseUser,
    counts: state.counts,
    targetOrganizationExists: Boolean(state.organization),
    conflictingEmails: state.users.map((user) => user.email),
  }));

  if (mode !== "apply") {
    console.log("Preflight only. Re-run with --apply to create the organization and role users.");
    process.exitCode = 0;
  } else {
    if (state.organization || state.users.length > 0) {
      throw new Error("Provisioning target already exists or conflicts with existing users; no changes were made");
    }

    const credentials = await Promise.all(targetUsers.map(async (user) => {
      const password = generatePassword();
      return { ...user, password, passwordHash: hashPassword(password) };
    }));

    const result = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: organizationName, slug: organizationSlug, plan: "starter" },
        select: { id: true, name: true, slug: true },
      });

      const createdUsers = [];
      for (const credential of credentials) {
        const user = await tx.user.create({
          data: {
            email: credential.email,
            name: credential.name,
            passwordHash: credential.passwordHash,
            defaultOrgId: organization.id,
            locale: "ru",
          },
          select: { id: true, email: true },
        });
        await tx.membership.create({
          data: { userId: user.id, orgId: organization.id, role: credential.role },
        });
        createdUsers.push({ ...user, role: credential.role });
      }

      const pipeline = await tx.leadPipeline.create({
        data: { orgId: organization.id, name: "Sales Pipeline", isDefault: true },
        select: { id: true },
      });
      for (const stage of leadStages) {
        await tx.leadPipelineStage.create({
          data: { ...stage, orgId: organization.id, pipelineId: pipeline.id },
        });
      }
      await tx.leadSlaPolicy.create({ data: { orgId: organization.id } });
      await tx.quoteSettings.create({ data: { orgId: organization.id } });

      const owner = createdUsers.find((user) => user.role === "OWNER");
      for (const user of createdUsers) {
        await tx.auditLog.create({
          data: {
            orgId: organization.id,
            userId: owner.id,
            action: "auth.user_provisioned",
            entityType: "user",
            entityId: user.id,
            metadata: JSON.stringify({ email: user.email, role: user.role }),
          },
        });
      }

      return { organization, users: createdUsers };
    }, { isolationLevel: "Serializable", timeout: 30_000 });

    const credentialDocument = {
      createdAt: new Date().toISOString(),
      applicationUrl,
      organization: result.organization,
      users: credentials.map(({ passwordHash: _passwordHash, ...credential }) => credential),
      securityNotice: "Keep this file private. It contains production passwords and is intentionally stored under ignored .tmp/.",
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(credentialDocument, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await chmod(outputPath, 0o600).catch(() => undefined);

    console.log(JSON.stringify({
      created: true,
      organization: result.organization,
      users: result.users,
      credentialsFile: outputPath,
    }));
  }
} finally {
  await db.$disconnect();
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function buildUsers(email) {
  const separator = email.lastIndexOf("@");
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  return ROLES.map((role) => ({
    role,
    name: ROLE_NAMES[role],
    email: role === "OWNER" ? email : `${local}+${role.toLowerCase()}@${domain}`,
  }));
}

function generatePassword() {
  return `Hv7!${randomBytes(18).toString("base64url")}`;
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64, {
    N: 32_768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    32_768,
    8,
    1,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

async function readState() {
  const [databaseUserRows, organizations, users, organizationCount, userCount, membershipCount] = await Promise.all([
    db.$queryRawUnsafe("select current_user"),
    db.organization.findMany({ where: { slug: organizationSlug }, select: { id: true, name: true, slug: true } }),
    db.user.findMany({ where: { email: { in: targetUsers.map((user) => user.email) } }, select: { id: true, email: true } }),
    db.organization.count(),
    db.user.count(),
    db.membership.count(),
  ]);
  return {
    databaseUser: databaseUserRows[0]?.current_user ?? null,
    organization: organizations[0] ?? null,
    users,
    counts: { organizations: organizationCount, users: userCount, memberships: membershipCount },
  };
}
