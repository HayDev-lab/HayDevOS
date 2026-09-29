/**
 * Pure document validation logic — no server-only APIs.
 *
 * Safe to import from test environments and from server entrypoints.
 * Server-only side effects (File/Buffer handling, ApiError responses) live in
 * `./validation.ts`, which re-exports the pure helpers below.
 */

import { unzipSync } from "fflate";

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 1;

type SupportedType = {
  mimeType: string;
  browserMimeTypes: readonly string[];
  validate: (bytes: Uint8Array) => boolean;
};

export function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function validText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export function validOoxml(bytes: Uint8Array, kind: "word" | "xl"): boolean {
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return false;
  try {
    const requiredPath = kind === "word" ? "word/document.xml" : "xl/workbook.xml";
    const extracted = unzipSync(bytes, {
      filter: (entry) =>
        (entry.name === "[Content_Types].xml" || entry.name === requiredPath) &&
        entry.originalSize <= 2 * 1024 * 1024,
    });
    return Boolean(extracted["[Content_Types].xml"] && extracted[requiredPath]);
  } catch {
    return false;
  }
}

export const SUPPORTED: Record<string, SupportedType> = {
  pdf: {
    mimeType: "application/pdf",
    browserMimeTypes: ["application/pdf", "application/octet-stream", ""],
    validate: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  },
  docx: {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    browserMimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream", ""],
    validate: (bytes) => validOoxml(bytes, "word"),
  },
  xlsx: {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    browserMimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream", ""],
    validate: (bytes) => validOoxml(bytes, "xl"),
  },
  csv: {
    mimeType: "text/csv",
    browserMimeTypes: ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain", ""],
    validate: validText,
  },
  txt: {
    mimeType: "text/plain",
    browserMimeTypes: ["text/plain", "application/octet-stream", ""],
    validate: validText,
  },
  png: {
    mimeType: "image/png",
    browserMimeTypes: ["image/png", "application/octet-stream", ""],
    validate: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  jpg: {
    mimeType: "image/jpeg",
    browserMimeTypes: ["image/jpeg", "image/jpg", "application/octet-stream", ""],
    validate: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9,
  },
  jpeg: {
    mimeType: "image/jpeg",
    browserMimeTypes: ["image/jpeg", "image/jpg", "application/octet-stream", ""],
    validate: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9,
  },
};

export const ALLOWED_DOCUMENT_MIME_TYPES = [...new Set(Object.values(SUPPORTED).map((entry) => entry.mimeType))];

export function extensionOf(filename: string): string {
  const normalized = filename.normalize("NFKC");
  const index = normalized.lastIndexOf(".");
  return index > -1 ? normalized.slice(index + 1).toLowerCase() : "";
}

export function sanitizeDownloadFilename(input: string): string {
  const normalized = input.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, "-")
    .replace(/\.\.+/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  const safe = normalized || "document";
  return safe.slice(0, 240);
}

export function sanitizeStorageFilename(input: string): string {
  const download = sanitizeDownloadFilename(input);
  const ascii = download
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return (ascii || `document.${extensionOf(download) || "bin"}`).slice(0, 180);
}

/**
 * Validate a decoded byte payload against the supported-type table.
 * Pure: no File/Buffer assumptions, no ApiError. Returns a discriminated
 * result so the server entrypoint can translate failures into HTTP errors.
 */
export type ValidationOk = {
  ok: true;
  filename: string;
  storageFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type ValidationErr =
  | { ok: false; code: "EMPTY_FILE" }
  | { ok: false; code: "PAYLOAD_TOO_LARGE"; maxBytes: number }
  | { ok: false; code: "UNSUPPORTED_FILE_TYPE" }
  | { ok: false; code: "MIME_MISMATCH" }
  | { ok: false; code: "FILE_SIGNATURE_MISMATCH" };

export type ValidationResult = ValidationOk | ValidationErr;

export function validateDocumentBytes(
  declaredName: string,
  declaredMime: string,
  declaredSize: number,
  bytes: Uint8Array,
): ValidationResult {
  if (declaredSize <= 0) return { ok: false, code: "EMPTY_FILE" };
  if (declaredSize > MAX_DOCUMENT_BYTES) return { ok: false, code: "PAYLOAD_TOO_LARGE", maxBytes: MAX_DOCUMENT_BYTES };
  const filename = sanitizeDownloadFilename(declaredName);
  const extension = extensionOf(filename);
  const supported = SUPPORTED[extension];
  if (!supported) return { ok: false, code: "UNSUPPORTED_FILE_TYPE" };
  const mime = declaredMime.trim().toLowerCase();
  if (!supported.browserMimeTypes.includes(mime)) return { ok: false, code: "MIME_MISMATCH" };
  if (bytes.byteLength !== declaredSize || !supported.validate(bytes)) {
    return { ok: false, code: "FILE_SIGNATURE_MISMATCH" };
  }
  return {
    ok: true,
    filename,
    storageFilename: sanitizeStorageFilename(filename),
    mimeType: supported.mimeType,
    sizeBytes: bytes.byteLength,
  };
}