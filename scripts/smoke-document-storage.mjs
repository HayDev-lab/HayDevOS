import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { StorageClient } from "@supabase/storage-js";

const url = process.env.SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();
const compatibilityJwt = process.env.SUPABASE_STORAGE_AUTH_JWT?.trim();
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
const bucket = process.env.HAYDEV_DOCUMENT_BUCKET?.trim() || "haydev-documents";
if (!url || !secret) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");

const storage = new StorageClient(`${url.replace(/\/$/, "")}/storage/v1`, {
  apikey: secret,
  ...(compatibilityJwt ? { Authorization: `Bearer ${compatibilityJwt}` } : {}),
  "X-Client-Info": "haydevos-storage-smoke/1.0",
});
const key = `system/storage-smoke/${randomUUID()}.txt`;
const bytes = randomBytes(128);
const expectedHash = createHash("sha256").update(bytes).digest("hex");
let uploaded = false;
try {
  let result = await storage.from(bucket).upload(key, bytes, { contentType: "text/plain", upsert: false, cacheControl: "0" });
  if (result.error) throw result.error;
  uploaded = true;
  result = await storage.from(bucket).download(key);
  if (result.error) throw result.error;
  const stored = Buffer.from(await result.data.arrayBuffer());
  if (createHash("sha256").update(stored).digest("hex") !== expectedHash) throw new Error("Downloaded object hash mismatch");
  const signed = await storage.from(bucket).createSignedUrl(key, 30, { download: "storage-smoke.txt" });
  if (signed.error) throw signed.error;
  const signedResponse = await fetch(signed.data.signedUrl, { redirect: "manual" });
  if (!signedResponse.ok) throw new Error(`Signed object access returned HTTP ${signedResponse.status}`);
  const publicResponse = await fetch(`${url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${key}`);
  if (publicResponse.ok) throw new Error("Private object was anonymously public");
  if (publishable) {
    const anonymous = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const denied = await anonymous.storage.from(bucket).download(key);
    if (!denied.error) throw new Error("Publishable client downloaded a private object without a policy");
  }
  console.log("PASS: private upload, hash round-trip, signed access, and anonymous denial");
} finally {
  if (uploaded) {
    const removed = await storage.from(bucket).remove([key]);
    if (removed.error) throw removed.error;
  }
}
