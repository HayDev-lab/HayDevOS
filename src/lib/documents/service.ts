import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/db";
import { requireErpPermission } from "@/lib/erp/permissions";
import { documentBucket, getStorage, StorageAdapterError } from "@/lib/storage";
import { getMalwareScanner, type MalwareScanResult } from "@/lib/malware";
import { requireDocumentPermission } from "./permissions";
import { buildQuoteDocumentModel } from "./quote-model";
import { renderQuoteDocument } from "./renderers";
import type {
  DocumentDto,
  DocumentFormat,
  DocumentLocale,
  DocumentVersionDto,
  DomainContext,
  GeneratedDocumentDto,
  QuoteDocumentModel,
} from "./types";
import { sanitizeStorageFilename, validateUploadedFile } from "./validation";

const json = (value: unknown) => value as Prisma.InputJsonValue;
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const newId = (prefix: string) => `${prefix}_${randomUUID().replaceAll("-", "")}`;
const initiatedBy = (context: DomainContext) =>
  context.initiatedBy === "owner_ai" ? "OWNER_AI"
    : context.initiatedBy === "automation" ? "AUTOMATION"
      : context.initiatedBy === "webhook" ? "SYSTEM" : "USER";

function retryableTransaction(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function serializable<T>(
  db: ReturnType<typeof getDb>,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!retryableTransaction(error) || attempt === 7) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5 * (attempt + 1)));
    }
  }
  throw new ApiError(503, "TRANSACTION_RETRY_EXHAUSTED", "The database is temporarily busy");
}

type VersionRow = {
  id: string;
  versionNumber: number;
  status: string;
  scanStatus: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  templateVersion: string | null;
  locale: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string | null } | null;
};

type DocumentRow = {
  id: string;
  title: string | null;
  filename: string;
  mime: string;
  size: number;
  status: string;
  documentType: string;
  sourceType: string;
  sourceId: string | null;
  classification: string | null;
  currentVersionNumber: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: { id: string; name: string | null } | null;
  currentVersion: VersionRow | null;
  versions?: VersionRow[];
};

const versionSelect = {
  id: true,
  versionNumber: true,
  status: true,
  scanStatus: true,
  filename: true,
  mimeType: true,
  sizeBytes: true,
  sha256: true,
  templateVersion: true,
  locale: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.DocumentVersionSelect;

function toVersionDto(version: VersionRow): DocumentVersionDto {
  return { ...version, createdAt: version.createdAt.toISOString() };
}

function toDocumentDto(document: DocumentRow): DocumentDto {
  return {
    id: document.id,
    title: document.title || document.filename,
    filename: document.filename,
    mimeType: document.mime,
    sizeBytes: document.size,
    status: document.status,
    scanStatus: document.currentVersion?.scanStatus ?? null,
    documentType: document.documentType,
    sourceType: document.sourceType,
    sourceId: document.sourceId,
    classification: document.classification,
    currentVersionNumber: document.currentVersionNumber,
    archivedAt: document.archivedAt?.toISOString() ?? null,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    uploadedBy: document.uploadedBy,
    currentVersion: document.currentVersion ? toVersionDto(document.currentVersion) : null,
    ...(document.versions ? { versions: document.versions.map(toVersionDto) } : {}),
  };
}

async function appendAudit(
  tx: Prisma.TransactionClient,
  context: DomainContext,
  action: string,
  documentId: string,
  metadata?: Record<string, unknown>,
) {
  await tx.auditLog.create({
    data: {
      orgId: context.orgId,
      userId: context.userId,
      action,
      entityType: "document",
      entityId: documentId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}

async function appendAccess(
  tx: Prisma.TransactionClient,
  context: DomainContext,
  input: {
    documentId: string;
    versionId?: string;
    action: string;
    outcome: "ALLOWED" | "DENIED" | "FAILED";
    metadata?: Record<string, unknown>;
  },
) {
  await tx.documentAccessEvent.create({
    data: {
      orgId: context.orgId,
      documentId: input.documentId,
      documentVersionId: input.versionId,
      actorId: context.userId,
      action: input.action,
      outcome: input.outcome,
      initiatedBy: initiatedBy(context),
      metadata: input.metadata ? json(input.metadata) : undefined,
    },
  });
}

function storageKey(orgId: string, documentId: string, versionId: string, filename: string): string {
  return `organizations/${orgId}/documents/${documentId}/versions/${versionId}/${sanitizeStorageFilename(filename)}`;
}

function storageApiError(error: unknown, operation: string): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof StorageAdapterError) {
    return new ApiError(503, "STORAGE_UNAVAILABLE", `Document ${operation} could not be completed`);
  }
  return new ApiError(500, "DOCUMENT_OPERATION_FAILED", `Document ${operation} could not be completed`);
}

export async function listDocuments(
  context: DomainContext,
  input: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    type?: string;
    sourceType?: string;
    mimeType?: string;
    includeArchived: boolean;
  },
) {
  requireDocumentPermission(context, "document.read");
  const where: Prisma.DocumentRecordWhereInput = {
    orgId: context.orgId,
    ...(input.includeArchived ? {} : { archivedAt: null }),
    ...(input.status ? { status: input.status } : {}),
    ...(input.type ? { documentType: input.type } : {}),
    ...(input.sourceType ? { sourceType: input.sourceType } : {}),
    ...(input.mimeType ? { mime: input.mimeType } : {}),
    ...(input.search ? {
      OR: [
        { title: { contains: input.search, mode: "insensitive" } },
        { filename: { contains: input.search, mode: "insensitive" } },
        { sourceId: { contains: input.search, mode: "insensitive" } },
      ],
    } : {}),
  };
  const [rows, total] = await Promise.all([
    getDb().documentRecord.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: {
        uploadedBy: { select: { id: true, name: true } },
        currentVersion: { select: versionSelect },
      },
    }),
    getDb().documentRecord.count({ where }),
  ]);
  return { items: rows.map((row) => toDocumentDto(row as DocumentRow)), page: input.page, pageSize: input.pageSize, total };
}

export async function getDocument(context: DomainContext, documentId: string): Promise<DocumentDto> {
  requireDocumentPermission(context, "document.read");
  const document = await getDb().documentRecord.findFirst({
    where: { id: documentId, orgId: context.orgId },
    include: {
      uploadedBy: { select: { id: true, name: true } },
      currentVersion: { select: versionSelect },
      versions: { select: versionSelect, orderBy: { versionNumber: "desc" } },
    },
  });
  if (!document) throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Document not found");
  return toDocumentDto(document as DocumentRow);
}

export async function uploadDocument(
  context: DomainContext,
  file: File,
  metadata: { documentId?: string; title?: string },
): Promise<DocumentDto> {
  requireDocumentPermission(context, "document.upload");
  const validated = await validateUploadedFile(file);
  let malwareScanner: ReturnType<typeof getMalwareScanner>;
  try {
    // Resolve the scanner before creating database rows or writing an object.
    // Missing scanner configuration must fail closed without leaving a
    // quarantined artifact that can never be processed.
    malwareScanner = getMalwareScanner();
  } catch {
    throw new ApiError(503, "MALWARE_SCANNER_UNAVAILABLE", "Document uploads are unavailable until malware scanning is configured");
  }
  const hash = sha256(validated.bytes);
  const bucket = documentBucket();
  const prepared = await serializable(getDb(), async (tx) => {
    const documentId = metadata.documentId ?? newId("doc");
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${context.orgId}:${documentId}`}, 0))::text`);
    let document = await tx.documentRecord.findFirst({ where: { id: documentId, orgId: context.orgId } });
    if (metadata.documentId) {
      if (!document) throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Document not found");
      if (document.archivedAt) throw new ApiError(409, "DOCUMENT_ARCHIVED", "Archived document cannot receive a new version");
      if (document.sourceType !== "UPLOAD" || document.generationKey) {
        throw new ApiError(409, "DOCUMENT_VERSION_POLICY", "Generated documents cannot be replaced by a browser upload");
      }
    } else {
      document = await tx.documentRecord.create({
        data: {
          id: documentId,
          orgId: context.orgId,
          filename: validated.filename,
          mime: validated.mimeType,
          size: validated.sizeBytes,
          status: "UPLOADING",
          title: metadata.title || validated.filename,
          documentType: "upload",
          sourceType: "UPLOAD",
          uploadedById: context.userId,
        },
      });
    }
    const aggregate = await tx.documentVersion.aggregate({ where: { documentId }, _max: { versionNumber: true } });
    const versionNumber = (aggregate._max.versionNumber ?? 0) + 1;
    const versionId = newId("dver");
    const key = storageKey(context.orgId, documentId, versionId, validated.storageFilename);
    await tx.documentVersion.create({
      data: {
        id: versionId,
        orgId: context.orgId,
        documentId,
        versionNumber,
        status: "UPLOADING",
        storageBucket: bucket,
        storageKey: key,
        filename: validated.filename,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        sha256: hash,
        scanStatus: "PENDING_SCAN",
        createdById: context.userId,
      },
    });
    await appendAudit(tx, context, "document.upload_started", documentId, { versionId, versionNumber, sizeBytes: validated.sizeBytes, mimeType: validated.mimeType });
    return { documentId, versionId, versionNumber, key };
  });

  let uploaded = false;
  let finalized = false;
  try {
    await getStorage().put({ bucket, key: prepared.key, bytes: validated.bytes, contentType: validated.mimeType });
    uploaded = true;
    const stored = await getStorage().get(bucket, prepared.key);
    if (stored.byteLength !== validated.sizeBytes || sha256(stored) !== hash) {
      throw new ApiError(503, "STORAGE_INTEGRITY_FAILURE", "Stored object failed integrity verification");
    }
    await getDb().$transaction(async (tx) => {
      await tx.documentVersion.update({ where: { id: prepared.versionId }, data: { status: "PENDING_SCAN" } });
      await tx.documentRecord.update({
        where: { id: prepared.documentId },
        data: {
          filename: validated.filename,
          mime: validated.mimeType,
          size: validated.sizeBytes,
          status: "PENDING_SCAN",
          currentVersionId: prepared.versionId,
          currentVersionNumber: prepared.versionNumber,
          ...(metadata.title ? { title: metadata.title } : {}),
        },
      });
      await appendAccess(tx, context, { documentId: prepared.documentId, versionId: prepared.versionId, action: "UPLOAD", outcome: "ALLOWED", metadata: { sha256: hash, sizeBytes: validated.sizeBytes } });
      await appendAudit(tx, context, "document.uploaded", prepared.documentId, { versionId: prepared.versionId, sha256: hash, scanStatus: "PENDING_SCAN" });
    });
    finalized = true;

    let scanResult: MalwareScanResult;
    try {
      scanResult = await malwareScanner.scan({
        bytes: stored,
        filename: validated.filename,
        contentType: validated.mimeType,
        sha256: hash,
      });
    } catch {
      await recordMalwareScanResult({
        documentVersionId: prepared.versionId,
        expectedSha256: hash,
        result: "SCAN_FAILED",
        provider: "metadefender-cloud",
      });
      throw new ApiError(503, "MALWARE_SCANNER_UNAVAILABLE", "The upload is quarantined because malware scanning is unavailable");
    }

    const persistedResult = scanResult.verdict === "CLEAN"
      ? "CLEAN"
      : scanResult.verdict === "INFECTED"
        ? "INFECTED"
        : "SCAN_FAILED";
    await recordMalwareScanResult({
      documentVersionId: prepared.versionId,
      expectedSha256: hash,
      result: persistedResult,
      provider: scanResult.provider,
      providerReference: scanResult.providerReference,
    });
    if (persistedResult === "INFECTED") {
      throw new ApiError(422, "MALWARE_DETECTED", "The uploaded file was rejected by malware scanning");
    }
    if (persistedResult === "SCAN_FAILED") {
      throw new ApiError(503, "MALWARE_SCAN_FAILED", "The upload is quarantined because malware scanning did not produce a trusted verdict");
    }
    return getDocument(context, prepared.documentId);
  } catch (error) {
    if (finalized) throw error;
    let cleanupFailed = false;
    if (uploaded) {
      try { await getStorage().remove(bucket, prepared.key); } catch { cleanupFailed = true; }
    }
    await getDb().$transaction(async (tx) => {
      await tx.documentVersion.updateMany({ where: { id: prepared.versionId, status: "UPLOADING" }, data: { status: "FAILED", errorCode: "STORAGE_WRITE_FAILED", errorMessage: cleanupFailed ? "Object cleanup requires reconciliation" : "Storage upload/finalization failed" } });
      await tx.documentRecord.updateMany({ where: { id: prepared.documentId, orgId: context.orgId, currentVersionId: null }, data: { status: "FAILED" } });
      await appendAccess(tx, context, { documentId: prepared.documentId, versionId: prepared.versionId, action: "UPLOAD", outcome: "FAILED", metadata: { cleanupFailed } });
      await appendAudit(tx, context, "document.upload_failed", prepared.documentId, { versionId: prepared.versionId, cleanupFailed });
    });
    throw storageApiError(error, "upload");
  }
}

function generatedDto(row: {
  id: string;
  documentId: string;
  documentVersionId: string;
  quoteId: string;
  quoteVersionId: string;
  format: string;
  locale: string;
  templateVersion: string;
  contentHash: string;
  generatedAt: Date;
  snapshot: Prisma.JsonValue;
  artifact: { sizeBytes: number; filename: string };
}): GeneratedDocumentDto {
  return {
    id: row.id,
    documentId: row.documentId,
    documentVersionId: row.documentVersionId,
    quoteId: row.quoteId,
    quoteVersionId: row.quoteVersionId,
    format: row.format as DocumentFormat,
    locale: row.locale as DocumentLocale,
    templateVersion: row.templateVersion,
    contentHash: row.contentHash,
    sizeBytes: row.artifact.sizeBytes,
    filename: row.artifact.filename,
    generatedAt: row.generatedAt.toISOString(),
    downloadPath: `/api/documents/${encodeURIComponent(row.documentId)}/download?versionId=${encodeURIComponent(row.documentVersionId)}`,
    snapshot: row.snapshot as unknown as QuoteDocumentModel,
  };
}

export async function generateQuoteArtifact(
  context: DomainContext,
  quoteId: string,
  versionId: string | undefined,
  format: DocumentFormat,
  locale: DocumentLocale,
): Promise<GeneratedDocumentDto> {
  requireDocumentPermission(context, "document.generate");
  const db = getDb();
  const quote = await db.quote.findFirst({ where: { id: quoteId, orgId: context.orgId }, select: { currentVersionId: true } });
  if (!quote) throw new ApiError(404, "QUOTE_NOT_FOUND", "Quote not found");
  const targetVersionId = versionId ?? quote.currentVersionId;
  if (!targetVersionId) throw new ApiError(409, "QUOTE_VERSION_REQUIRED", "Quote has no immutable version");
  const version = await db.quoteVersion.findFirst({ where: { id: targetVersionId, quoteId, orgId: context.orgId } });
  if (!version) throw new ApiError(404, "QUOTE_VERSION_NOT_FOUND", "Quote version not found");
  const model = buildQuoteDocumentModel(version, locale);
  const rendered = await renderQuoteDocument(model, format);
  const hash = sha256(rendered.bytes);
  const extension = format;
  const filename = sanitizeStorageFilename(`${model.quoteNumber}-v${model.versionNumber}-${locale}.${extension}`);
  const bucket = documentBucket();
  const generationKey = `${version.id}:${format}:${version.templateVersion}:${locale}`;

  const prepared = await serializable(db, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${context.orgId}:${generationKey}`}, 0))::text`);
    const existing = await tx.generatedQuoteDocument.findUnique({
      where: { quoteVersionId_format_templateVersion_locale: { quoteVersionId: version.id, format, templateVersion: version.templateVersion, locale } },
      include: { artifact: { select: { sizeBytes: true, filename: true } } },
    });
    if (existing) return { kind: "existing" as const, existing };
    const running = await tx.documentGeneration.findFirst({ where: { orgId: context.orgId, generationKey, status: "RUNNING" }, select: { id: true } });
    if (running) throw new ApiError(409, "GENERATION_IN_PROGRESS", "Identical document generation is already running");
    const templateVersion = version.templateVersion.startsWith("quote-") ? version.templateVersion.slice("quote-".length) : version.templateVersion;
    await tx.documentTemplate.createMany({
      data: [{
        id: newId("dtpl"), orgId: context.orgId, key: "quote", version: templateVersion,
        name: `Quote ${version.templateVersion}`, type: "QUOTE", locale: null,
        definition: json({ renderer: version.templateVersion, executable: false }), createdById: null,
      }],
      skipDuplicates: true,
    });
    let document = await tx.documentRecord.findUnique({ where: { orgId_generationKey: { orgId: context.orgId, generationKey } } });
    if (!document) {
      document = await tx.documentRecord.create({
        data: {
          id: newId("doc"), orgId: context.orgId, filename, mime: rendered.mimeType,
          size: rendered.bytes.byteLength, status: "GENERATING", title: `${model.quoteNumber} ${format.toUpperCase()}`,
          documentType: `quote_${format}`, sourceType: "QUOTE", sourceId: quoteId,
          generationKey, uploadedById: context.userId,
        },
      });
    }
    const aggregate = await tx.documentVersion.aggregate({ where: { documentId: document.id }, _max: { versionNumber: true } });
    const artifactVersionNumber = (aggregate._max.versionNumber ?? 0) + 1;
    const artifactId = newId("dver");
    const key = storageKey(context.orgId, document.id, artifactId, filename);
    await tx.documentVersion.create({
      data: {
        id: artifactId, orgId: context.orgId, documentId: document.id, versionNumber: artifactVersionNumber,
        status: "GENERATING", storageBucket: bucket, storageKey: key, filename,
        mimeType: rendered.mimeType, sizeBytes: rendered.bytes.byteLength, sha256: hash,
        scanStatus: "NOT_REQUIRED", templateVersion: version.templateVersion, locale,
        sourceSnapshot: json(model), createdById: context.userId,
      },
    });
    const generation = await tx.documentGeneration.create({
      data: {
        id: newId("dgen"), orgId: context.orgId, documentId: document.id, documentVersionId: artifactId,
        quoteId, quoteVersionId: version.id, generationKey, format, locale,
        templateVersion: version.templateVersion, initiatedBy: initiatedBy(context), actorId: context.userId,
      },
    });
    await appendAudit(tx, context, "document.generation_started", document.id, { generationId: generation.id, quoteId, quoteVersionId: version.id, format, locale });
    return { kind: "prepared" as const, documentId: document.id, artifactId, artifactVersionNumber, generationId: generation.id, key };
  });

  if (prepared.kind === "existing") return generatedDto(prepared.existing);
  let uploaded = false;
  try {
    await getStorage().put({ bucket, key: prepared.key, bytes: rendered.bytes, contentType: rendered.mimeType });
    uploaded = true;
    const stored = await getStorage().get(bucket, prepared.key);
    if (stored.byteLength !== rendered.bytes.byteLength || sha256(stored) !== hash) {
      throw new ApiError(503, "STORAGE_INTEGRITY_FAILURE", "Generated object failed integrity verification");
    }
    const generated = await db.$transaction(async (tx) => {
      await tx.documentVersion.update({ where: { id: prepared.artifactId }, data: { status: "ACTIVE" } });
      await tx.documentRecord.update({
        where: { id: prepared.documentId },
        data: {
          filename, mime: rendered.mimeType, size: rendered.bytes.byteLength, status: "ACTIVE",
          currentVersionId: prepared.artifactId, currentVersionNumber: prepared.artifactVersionNumber,
        },
      });
      await tx.documentGeneration.update({ where: { id: prepared.generationId }, data: { status: "SUCCEEDED", completedAt: new Date() } });
      const row = await tx.generatedQuoteDocument.create({
        data: {
          id: newId("qdoc"), orgId: context.orgId, quoteId, quoteVersionId: version.id,
          format, templateVersion: version.templateVersion, locale, snapshot: json(model), contentHash: hash,
          storagePath: prepared.key, documentId: prepared.documentId, documentVersionId: prepared.artifactId,
          generatedById: context.userId,
        },
        include: { artifact: { select: { sizeBytes: true, filename: true } } },
      });
      await tx.quoteEvent.create({ data: {
        orgId: context.orgId, quoteId, quoteVersionId: version.id, actorId: context.userId,
        type: "quote.document_generated", body: `${format.toUpperCase()} generated from immutable quote version`,
        idempotencyKey: `document.generated:${prepared.artifactId}`,
        metadata: json({ documentId: prepared.documentId, documentVersionId: prepared.artifactId, format, locale, sha256: hash, initiatedBy: initiatedBy(context) }),
      } });
      await appendAccess(tx, context, { documentId: prepared.documentId, versionId: prepared.artifactId, action: "GENERATE", outcome: "ALLOWED", metadata: { quoteId, quoteVersionId: version.id, format, locale, sha256: hash } });
      await appendAudit(tx, context, "document.generated", prepared.documentId, { generationId: prepared.generationId, quoteId, quoteVersionId: version.id, versionId: prepared.artifactId, format, locale, sha256: hash });
      return row;
    });
    return generatedDto(generated);
  } catch (error) {
    let cleanupFailed = false;
    if (uploaded) {
      try { await getStorage().remove(bucket, prepared.key); } catch { cleanupFailed = true; }
    }
    await db.$transaction(async (tx) => {
      await tx.documentVersion.updateMany({ where: { id: prepared.artifactId, status: "GENERATING" }, data: { status: "FAILED", errorCode: "GENERATION_STORAGE_FAILED", errorMessage: cleanupFailed ? "Object cleanup requires reconciliation" : "Generation upload/finalization failed" } });
      await tx.documentGeneration.updateMany({ where: { id: prepared.generationId, status: "RUNNING" }, data: { status: "FAILED", errorCode: "GENERATION_STORAGE_FAILED", errorMessage: cleanupFailed ? "Object cleanup requires reconciliation" : "Generation upload/finalization failed", completedAt: new Date() } });
      await tx.documentRecord.updateMany({ where: { id: prepared.documentId, orgId: context.orgId, currentVersionId: null }, data: { status: "FAILED" } });
      await appendAccess(tx, context, { documentId: prepared.documentId, versionId: prepared.artifactId, action: "GENERATE", outcome: "FAILED", metadata: { quoteId, quoteVersionId: version.id, format, locale, cleanupFailed } });
      await appendAudit(tx, context, "document.generation_failed", prepared.documentId, { generationId: prepared.generationId, quoteId, quoteVersionId: version.id, format, locale, cleanupFailed });
    });
    throw storageApiError(error, "generation");
  }
}

export async function createDocumentDownload(
  context: DomainContext,
  documentId: string,
  requestedVersionId?: string,
): Promise<{ url: string; expiresAt: string; filename: string }> {
  requireDocumentPermission(context, "document.read");
  const document = await getDb().documentRecord.findFirst({
    where: { id: documentId, orgId: context.orgId },
    select: {
      id: true,
      status: true,
      archivedAt: true,
      currentVersionId: true,
      versions: {
        where: requestedVersionId ? { id: requestedVersionId } : undefined,
        orderBy: { versionNumber: "desc" },
        take: requestedVersionId ? 1 : undefined,
        select: { id: true, status: true, scanStatus: true, storageBucket: true, storageKey: true, filename: true },
      },
    },
  });
  if (!document) {
    await getDb().auditLog.create({ data: { orgId: context.orgId, userId: context.userId, action: "document.access_denied", entityType: "document", entityId: documentId, metadata: JSON.stringify({ reason: "not_found" }) } });
    throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Document not found");
  }
  if (document.status !== "ACTIVE" || document.archivedAt) {
    await getDb().$transaction(async (tx) => {
      await appendAccess(tx, context, {
        documentId,
        action: "DOWNLOAD",
        outcome: "DENIED",
        metadata: {
          status: document.status,
          archivedAt: document.archivedAt?.toISOString() ?? null,
        },
      });
      await appendAudit(tx, context, "document.access_denied", documentId, {
        status: document.status,
        archivedAt: document.archivedAt?.toISOString() ?? null,
      });
    });
    throw new ApiError(423, "DOCUMENT_NOT_RELEASED", "Document is not available for download");
  }
  const versionId = requestedVersionId ?? document.currentVersionId;
  const version = document.versions.find((candidate) => candidate.id === versionId);
  if (!version) throw new ApiError(404, "DOCUMENT_VERSION_NOT_FOUND", "Document version not found");
  if (version.status !== "ACTIVE" || !["CLEAN", "NOT_REQUIRED"].includes(version.scanStatus)) {
    await getDb().$transaction(async (tx) => {
      await appendAccess(tx, context, { documentId, versionId: version.id, action: "DOWNLOAD", outcome: "DENIED", metadata: { status: version.status, scanStatus: version.scanStatus } });
      await appendAudit(tx, context, "document.access_denied", documentId, { versionId: version.id, status: version.status, scanStatus: version.scanStatus });
    });
    throw new ApiError(423, "DOCUMENT_NOT_RELEASED", "Document is not available for download");
  }
  const configuredTtl = Number(process.env.HAYDEV_DOCUMENT_SIGNED_URL_TTL_SECONDS ?? "60");
  const ttl = Number.isFinite(configuredTtl) ? Math.min(Math.max(Math.trunc(configuredTtl), 30), 300) : 60;
  try {
    const url = await getStorage().createSignedAccess({ bucket: version.storageBucket, key: version.storageKey, expiresInSeconds: ttl, downloadName: version.filename });
    await getDb().$transaction(async (tx) => {
      await appendAccess(tx, context, { documentId, versionId: version.id, action: "DOWNLOAD", outcome: "ALLOWED", metadata: { ttlSeconds: ttl } });
      await appendAudit(tx, context, "document.downloaded", documentId, { versionId: version.id, ttlSeconds: ttl });
    });
    return { url, expiresAt: new Date(Date.now() + ttl * 1_000).toISOString(), filename: version.filename };
  } catch (error) {
    await getDb().$transaction(async (tx) => {
      await appendAccess(tx, context, { documentId, versionId: version.id, action: "DOWNLOAD", outcome: "FAILED" });
      await appendAudit(tx, context, "document.download_failed", documentId, { versionId: version.id });
    });
    throw storageApiError(error, "download");
  }
}

export async function archiveDocument(context: DomainContext, documentId: string): Promise<DocumentDto> {
  requireDocumentPermission(context, "document.archive");
  const updated = await getDb().$transaction(async (tx) => {
    const result = await tx.documentRecord.updateMany({
      where: { id: documentId, orgId: context.orgId, archivedAt: null },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    if (result.count !== 1) throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Document not found");
    await appendAccess(tx, context, { documentId, action: "ARCHIVE", outcome: "ALLOWED" });
    await appendAudit(tx, context, "document.archived", documentId);
  });
  void updated;
  return getDocument(context, documentId);
}

export async function linkDocumentToOrder(
  context: DomainContext,
  documentId: string,
  orderId: string,
): Promise<DocumentDto> {
  requireDocumentPermission(context, "document.read");
  requireErpPermission(context, "document.link");
  await serializable(getDb(), async (tx) => {
    const [document, order] = await Promise.all([
      tx.documentRecord.findFirst({ where: { id: documentId, orgId: context.orgId, archivedAt: null } }),
      tx.order.findFirst({ where: { id: orderId, orgId: context.orgId, archivedAt: null }, select: { id: true, number: true } }),
    ]);
    if (!document) throw new ApiError(404, "DOCUMENT_NOT_FOUND", "Document not found");
    if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
    if (document.sourceType === "ORDER" && document.sourceId === orderId) return;
    if (document.sourceType !== "UPLOAD" || document.sourceId !== null) {
      throw new ApiError(409, "DOCUMENT_SOURCE_IMMUTABLE", "Only an unbound uploaded document can be linked to an order");
    }
    await tx.documentRecord.update({ where: { id: document.id }, data: { sourceType: "ORDER", sourceId: orderId } });
    await appendAccess(tx, context, { documentId, action: "LINK_ORDER", outcome: "ALLOWED", metadata: { orderId } });
    await appendAudit(tx, context, "document.linked_to_order", documentId, { orderId, orderNumber: order.number });
  });
  return getDocument(context, documentId);
}

/**
 * Trusted persistence boundary for the malware adapter. It is intentionally
 * not exposed as a browser route; only the server-side upload/scanner flow may
 * release a quarantined version.
 */
export async function recordMalwareScanResult(input: {
  documentVersionId: string;
  expectedSha256: string;
  result: "CLEAN" | "INFECTED" | "SCAN_FAILED";
  provider: string;
  providerReference?: string;
}): Promise<void> {
  const db = getDb();
  await serializable(db, async (tx) => {
    const version = await tx.documentVersion.findUnique({
      where: { id: input.documentVersionId },
      select: { id: true, orgId: true, documentId: true, sha256: true, status: true, scanStatus: true },
    });
    if (!version) throw new ApiError(404, "DOCUMENT_VERSION_NOT_FOUND", "Document version not found");
    if (version.sha256 !== input.expectedSha256) {
      throw new ApiError(409, "SCAN_HASH_MISMATCH", "Scanner result does not match the immutable document bytes");
    }
    if (version.scanStatus === input.result) return;
    if (version.status !== "PENDING_SCAN" || version.scanStatus !== "PENDING_SCAN") {
      throw new ApiError(409, "SCAN_RESULT_CONFLICT", "Document version is no longer awaiting a scan result");
    }
    const nextStatus = input.result === "CLEAN" ? "ACTIVE" : input.result === "INFECTED" ? "REJECTED" : "FAILED";
    await tx.documentVersion.update({
      where: { id: version.id },
      data: {
        status: nextStatus,
        scanStatus: input.result,
        ...(input.result === "SCAN_FAILED" ? { errorCode: "MALWARE_SCAN_FAILED", errorMessage: "Malware scanner did not produce a trusted verdict" } : {}),
      },
    });
    await tx.documentRecord.updateMany({
      where: { id: version.documentId, orgId: version.orgId, currentVersionId: version.id },
      data: { status: nextStatus },
    });
    const metadata = {
      provider: input.provider.slice(0, 100),
      providerReference: input.providerReference?.slice(0, 200) ?? null,
      scanResult: input.result,
      sha256: version.sha256,
    };
    await tx.documentAccessEvent.create({ data: {
      orgId: version.orgId, documentId: version.documentId, documentVersionId: version.id,
      action: "MALWARE_SCAN", outcome: input.result === "CLEAN" ? "ALLOWED" : input.result === "INFECTED" ? "DENIED" : "FAILED",
      initiatedBy: "SYSTEM", metadata: json(metadata),
    } });
    await tx.auditLog.create({ data: {
      orgId: version.orgId, action: "document.malware_scan_completed", entityType: "document",
      entityId: version.documentId, metadata: JSON.stringify({ ...metadata, versionId: version.id }),
    } });
  });
}

export async function getDocumentSummaryForOwnerAi(context: DomainContext) {
  requireDocumentPermission(context, "document.read");
  const [total, byStatus, recentFailures] = await Promise.all([
    getDb().documentRecord.count({ where: { orgId: context.orgId, archivedAt: null } }),
    getDb().documentRecord.groupBy({ by: ["status"], where: { orgId: context.orgId, archivedAt: null }, _count: { _all: true } }),
    getDb().documentGeneration.findMany({ where: { orgId: context.orgId, status: "FAILED" }, select: { id: true, documentId: true, format: true, errorCode: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    recentFailures: recentFailures.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  };
}

export async function findDocumentsForOwnerAi(context: DomainContext, query: string) {
  requireDocumentPermission(context, "document.read");
  const value = query.trim().slice(0, 200);
  if (!value) return [];
  const rows = await getDb().documentRecord.findMany({
    where: { orgId: context.orgId, archivedAt: null, OR: [{ title: { contains: value, mode: "insensitive" } }, { filename: { contains: value, mode: "insensitive" } }, { sourceId: { contains: value, mode: "insensitive" } }] },
    select: { id: true, title: true, filename: true, status: true, documentType: true, sourceType: true, sourceId: true, currentVersionNumber: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function getQuoteDocumentForOwnerAi(context: DomainContext, quoteId: string) {
  requireDocumentPermission(context, "document.read");
  const rows = await getDb().generatedQuoteDocument.findMany({
    where: { orgId: context.orgId, quoteId },
    select: { id: true, documentId: true, documentVersionId: true, quoteVersionId: true, format: true, locale: true, templateVersion: true, contentHash: true, generatedAt: true, artifact: { select: { filename: true, sizeBytes: true, status: true } } },
    orderBy: { generatedAt: "desc" },
  });
  return rows.map((row) => ({ ...row, generatedAt: row.generatedAt.toISOString(), downloadPath: `/api/documents/${encodeURIComponent(row.documentId)}/download?versionId=${encodeURIComponent(row.documentVersionId)}` }));
}
