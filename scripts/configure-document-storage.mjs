import { StorageClient } from "@supabase/storage-js";

const url = process.env.SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();
const compatibilityJwt = process.env.SUPABASE_STORAGE_AUTH_JWT?.trim();
const bucket = process.env.HAYDEV_DOCUMENT_BUCKET?.trim() || "haydev-documents";

if (!url || !secret) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}
const parsed = new URL(url);
if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
  throw new Error("SUPABASE_URL must use HTTPS outside local development");
}
if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
  throw new Error("HAYDEV_DOCUMENT_BUCKET is invalid");
}

const options = {
  public: false,
  fileSizeLimit: 25 * 1024 * 1024,
  allowedMimeTypes: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/json",
    "text/csv",
    "text/plain",
    "image/png",
    "image/jpeg",
  ],
};
const storage = new StorageClient(`${url.replace(/\/$/, "")}/storage/v1`, {
  apikey: secret,
  ...(compatibilityJwt ? { Authorization: `Bearer ${compatibilityJwt}` } : {}),
  "X-Client-Info": "haydevos-storage-config/1.0",
});
const { data: existing, error: getError } = await storage.getBucket(bucket);
if (getError && !/not found/i.test(getError.message)) throw getError;
if (existing) {
  const { error } = await storage.updateBucket(bucket, options);
  if (error) throw error;
  console.log(`Updated private bucket ${bucket}`);
} else {
  const { error } = await storage.createBucket(bucket, options);
  if (error) throw error;
  console.log(`Created private bucket ${bucket}`);
}
const { data: verified, error: verifyError } = await storage.getBucket(bucket);
if (verifyError) throw verifyError;
if (!verified || verified.public || Number(verified.file_size_limit) !== options.fileSizeLimit) {
  throw new Error("Bucket verification failed: expected private bucket with 25 MB limit");
}
const actualMimeTypes = [...(verified.allowed_mime_types ?? [])].sort();
const expectedMimeTypes = [...options.allowedMimeTypes].sort();
if (JSON.stringify(actualMimeTypes) !== JSON.stringify(expectedMimeTypes)) {
  throw new Error("Bucket verification failed: MIME allowlist differs from the committed configuration");
}
console.log(`Verified ${bucket}: private=true, limit=${options.fileSizeLimit}, mimeTypes=${actualMimeTypes.length}`);
