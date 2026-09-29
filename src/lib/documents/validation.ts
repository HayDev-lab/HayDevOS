import "server-only";

import { ApiError } from "@/lib/api/errors";

// Pure validation helpers live in validation-core.ts so they can be imported
// from test environments without pulling in the `server-only` boundary. The
// server entrypoint below wraps the pure result into ApiError responses and
// keeps the `server-only` guard intact for production callers.
export {
  MAX_DOCUMENT_BYTES,
  MAX_UPLOAD_FILES,
  ALLOWED_DOCUMENT_MIME_TYPES,
  SUPPORTED,
  startsWith,
  validText,
  validOoxml,
  extensionOf,
  sanitizeDownloadFilename,
  sanitizeStorageFilename,
  validateDocumentBytes,
  type ValidationResult,
  type ValidationOk,
  type ValidationErr,
} from "./validation-core";

import { validateDocumentBytes } from "./validation-core";

/**
 * Server-only entrypoint: accepts a Web `File`, decodes it, runs the pure
 * validation, and translates failures into `ApiError` responses.
 */
export async function validateUploadedFile(file: File): Promise<{
  bytes: Buffer;
  filename: string;
  storageFilename: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const result = validateDocumentBytes(file.name, file.type, file.size, bytes);
  if (!result.ok) {
    switch (result.code) {
      case "EMPTY_FILE":
        throw new ApiError(422, "EMPTY_FILE", "File is empty");
      case "PAYLOAD_TOO_LARGE":
        throw new ApiError(413, "PAYLOAD_TOO_LARGE", "File exceeds the 25 MB upload limit");
      case "UNSUPPORTED_FILE_TYPE":
        throw new ApiError(415, "UNSUPPORTED_FILE_TYPE", "File extension is not allowed");
      case "MIME_MISMATCH":
        throw new ApiError(415, "MIME_MISMATCH", "Declared MIME type does not match the file extension");
      case "FILE_SIGNATURE_MISMATCH":
        throw new ApiError(415, "FILE_SIGNATURE_MISMATCH", "File content does not match the allowed document type");
    }
  }
  return {
    bytes,
    filename: result.filename,
    storageFilename: result.storageFilename,
    mimeType: result.mimeType,
    sizeBytes: result.sizeBytes,
  };
}
