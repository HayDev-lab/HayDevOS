import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { PrismaClient } from "@prisma/client";

import { createDocumentDownload } from "../src/lib/documents/service";
import type { DomainContext } from "../src/lib/documents/types";

setDefaultTimeout(30_000);

const db = new PrismaClient();
const suffix = `${Date.now()}_${process.pid}`;
const orgId = `archived_doc_org_${suffix}`;
const userId = `archived_doc_user_${suffix}`;
const documentId = `archived_doc_${suffix}`;
const versionId = `archived_version_${suffix}`;
const context: DomainContext = { orgId, userId, role: "OWNER", initiatedBy: "user" };

beforeAll(async () => {
  await db.organization.create({ data: { id: orgId, name: "Archived document test", slug: `archived-doc-${suffix}` } });
  await db.user.create({ data: { id: userId, email: `archived-doc-${suffix}@example.invalid` } });
  await db.membership.create({ data: { orgId, userId, role: "OWNER" } });
  await db.documentRecord.create({
    data: {
      id: documentId,
      orgId,
      filename: "archived.txt",
      mime: "text/plain",
      size: 8,
      status: "ARCHIVED",
      archivedAt: new Date(),
      uploadedById: userId,
      title: "Archived",
      documentType: "upload",
      sourceType: "UPLOAD",
    },
  });
  await db.documentVersion.create({
    data: {
      id: versionId,
      orgId,
      documentId,
      versionNumber: 1,
      status: "ACTIVE",
      storageBucket: "haydev-documents",
      storageKey: `organizations/${orgId}/documents/${documentId}/versions/${versionId}/archived.txt`,
      filename: "archived.txt",
      mimeType: "text/plain",
      sizeBytes: 8,
      sha256: "a".repeat(64),
      scanStatus: "CLEAN",
      createdById: userId,
    },
  });
  await db.documentRecord.update({
    where: { id: documentId },
    data: { currentVersionId: versionId, currentVersionNumber: 1 },
  });
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: orgId } });
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});

describe("Archived document download authorization", () => {
  test("denies both current and explicit-version signed access", async () => {
    await expect(createDocumentDownload(context, documentId)).rejects.toMatchObject({
      status: 423,
      code: "DOCUMENT_NOT_RELEASED",
    });
    await expect(createDocumentDownload(context, documentId, versionId)).rejects.toMatchObject({
      status: 423,
      code: "DOCUMENT_NOT_RELEASED",
    });
  });
});
