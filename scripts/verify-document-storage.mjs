import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { StorageClient } from "@supabase/storage-js";

const hashObjects = process.argv.includes("--hash");
const url = process.env.SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();
const compatibilityJwt = process.env.SUPABASE_STORAGE_AUTH_JWT?.trim();
const bucket = process.env.HAYDEV_DOCUMENT_BUCKET?.trim() || "haydev-documents";
if (!url || !secret) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
}

// The compatibility JWT also remains a valid service-role API key for
// PostgREST while this project's hosted gateway rejects its opaque secret.
const supabase = createClient(url, compatibilityJwt || secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const storage = new StorageClient(`${url.replace(/\/$/, "")}/storage/v1`, {
  apikey: secret,
  ...(compatibilityJwt ? { Authorization: `Bearer ${compatibilityJwt}` } : {}),
  "X-Client-Info": "haydevos-storage-reconciliation/1.0",
});

async function list(prefix = "", output = []) {
  for (let offset = 0; ; offset += 1_000) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit: 1_000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    for (const entry of data ?? []) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) await list(key, output);
      else output.push({ key, size: typeof entry.metadata?.size === "number" ? entry.metadata.size : null });
    }
    if ((data?.length ?? 0) < 1_000) return output;
  }
}

async function listVersions() {
  const output = [];
  for (let from = 0; ; from += 1_000) {
    const { data, error } = await supabase.from("DocumentVersion")
      .select("id,orgId,status,storageBucket,storageKey,sizeBytes,sha256")
      .order("id", { ascending: true }).range(from, from + 999);
    if (error) throw error;
    output.push(...(data ?? []));
    if ((data?.length ?? 0) < 1_000) return output;
  }
}

const versions = await listVersions();
const objects = await list();
const byKey = new Map(objects.map((object) => [object.key, object]));
const metadataKeys = new Set(versions.filter((version) => version.storageBucket === bucket).map((version) => version.storageKey));
const missing = [];
const sizeMismatch = [];
const hashMismatch = [];
for (const version of versions.filter((row) => row.status !== "FAILED" && row.storageBucket === bucket)) {
  const object = byKey.get(version.storageKey);
  if (!object) { missing.push({ versionId: version.id, key: version.storageKey }); continue; }
  if (object.size !== null && object.size !== version.sizeBytes) sizeMismatch.push({ versionId: version.id, expected: version.sizeBytes, actual: object.size });
  if (hashObjects) {
    const { data, error } = await storage.from(bucket).download(version.storageKey);
    if (error) throw error;
    const actual = createHash("sha256").update(Buffer.from(await data.arrayBuffer())).digest("hex");
    if (actual !== version.sha256) hashMismatch.push({ versionId: version.id, expected: version.sha256, actual });
  }
}
const orphanObjects = objects.filter((object) => !metadataKeys.has(object.key)).map((object) => object.key);
const report = { bucket, metadataVersions: versions.length, storageObjects: objects.length, missing, sizeMismatch, hashMismatch, orphanObjects };
console.log(JSON.stringify(report, null, 2));
if (missing.length || sizeMismatch.length || hashMismatch.length || orphanObjects.length) process.exitCode = 1;
