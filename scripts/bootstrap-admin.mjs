import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const required = [
  "HAYDEV_BOOTSTRAP_EMAIL",
  "HAYDEV_BOOTSTRAP_NAME",
  "HAYDEV_BOOTSTRAP_PASSWORD",
  "HAYDEV_BOOTSTRAP_ORG_NAME",
  "HAYDEV_BOOTSTRAP_ORG_SLUG",
];

for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required`);
}

const email = process.env.HAYDEV_BOOTSTRAP_EMAIL.trim().toLowerCase();
const name = process.env.HAYDEV_BOOTSTRAP_NAME.trim();
const password = process.env.HAYDEV_BOOTSTRAP_PASSWORD;
const orgName = process.env.HAYDEV_BOOTSTRAP_ORG_NAME.trim();
const orgSlug = process.env.HAYDEV_BOOTSTRAP_ORG_SLUG.trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("HAYDEV_BOOTSTRAP_EMAIL must be a valid email address");
}
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(orgSlug)) {
  throw new Error("HAYDEV_BOOTSTRAP_ORG_SLUG must be a lowercase URL slug");
}
if (
  password.length < 14 ||
  !/[a-z]/.test(password) ||
  !/[A-Z]/.test(password) ||
  !/[0-9]/.test(password) ||
  !/[^A-Za-z0-9]/.test(password)
) {
  throw new Error("Bootstrap password must be 14+ chars with upper, lower, digit, and symbol");
}

const salt = randomBytes(16);
const derivedKey = scryptSync(password, salt, 64, {
  N: 32_768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});
const passwordHash = [
  "scrypt",
  32_768,
  8,
  1,
  salt.toString("base64url"),
  derivedKey.toString("base64url"),
].join("$");

const db = new PrismaClient();

const leadStages = [
  { key: "new", name: "New", position: 0, isClosed: false, isWon: false, color: "cyan" },
  { key: "contacted", name: "Contacted", position: 1, isClosed: false, isWon: false, color: "muted" },
  { key: "qualified", name: "Qualified", position: 2, isClosed: false, isWon: false, color: "lime" },
  { key: "proposal", name: "Proposal", position: 3, isClosed: false, isWon: false, color: "amber" },
  { key: "negotiation", name: "Negotiation", position: 4, isClosed: false, isWon: false, color: "violet" },
  { key: "won", name: "Won", position: 5, isClosed: true, isWon: true, color: "success" },
  { key: "lost", name: "Lost", position: 6, isClosed: true, isWon: false, color: "rose" },
];

try {
  const result = await db.$transaction(async (tx) => {
    const existingOrg = await tx.organization.findUnique({ where: { slug: orgSlug } });
    const existingUser = await tx.user.findUnique({ where: { email } });
    if (existingOrg || existingUser) {
      if (!existingOrg || !existingUser) {
        throw new Error("Bootstrap identity conflicts with existing production data; no changes were made");
      }
      const membership = await tx.membership.findUnique({
        where: { userId_orgId: { userId: existingUser.id, orgId: existingOrg.id } },
      });
      if (!membership || membership.role !== "OWNER" || existingUser.defaultOrgId !== existingOrg.id) {
        throw new Error("Existing bootstrap identity is not the expected OWNER; no changes were made");
      }
      return { userId: existingUser.id, orgId: existingOrg.id, alreadyExists: true };
    }

    const org = await tx.organization.create({
      data: { name: orgName, slug: orgSlug, plan: "starter" },
    });
    const user = await tx.user.create({
      data: { email, name, passwordHash, defaultOrgId: org.id },
    });
    await tx.membership.create({
      data: { userId: user.id, orgId: org.id, role: "OWNER" },
    });
    const pipeline = await tx.leadPipeline.upsert({
      where: { orgId_name: { orgId: org.id, name: "Sales Pipeline" } },
      update: { isDefault: true, archivedAt: null },
      create: { orgId: org.id, name: "Sales Pipeline", isDefault: true },
    });
    for (const stage of leadStages) {
      await tx.leadPipelineStage.upsert({
        where: { pipelineId_key: { pipelineId: pipeline.id, key: stage.key } },
        update: stage,
        create: { ...stage, orgId: org.id, pipelineId: pipeline.id },
      });
    }
    await tx.leadSlaPolicy.upsert({
      where: { orgId: org.id },
      update: {},
      create: { orgId: org.id },
    });
    await tx.quoteSettings.upsert({
      where: { orgId: org.id },
      update: {},
      create: { orgId: org.id },
    });
    return { userId: user.id, orgId: org.id, alreadyExists: false };
  });
  console.log(result.alreadyExists
    ? `Bootstrap already completed (user=${result.userId}, org=${result.orgId}); no credentials or roles changed.`
    : `Bootstrap owner ready (user=${result.userId}, org=${result.orgId}).`);
  console.log("Remove all HAYDEV_BOOTSTRAP_* variables from the runtime environment now.");
} finally {
  await db.$disconnect();
}
