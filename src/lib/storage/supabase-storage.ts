import "server-only";

import { StorageClient } from "@supabase/storage-js";

import {
  StorageAdapterError,
  type PutObjectInput,
  type SignedAccessInput,
  type StorageAdapter,
  type StoredObjectInfo,
} from "./types";

let client: StorageClient | undefined;

function storageClient(): StorageClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  const compatibilityJwt = process.env.SUPABASE_STORAGE_AUTH_JWT?.trim();
  if (!url || !secret) {
    throw new StorageAdapterError(
      "configure",
      "STORAGE_CONFIGURATION_REQUIRED",
      "Supabase Storage server configuration is missing",
    );
  }
  // New `sb_secret_...` keys are opaque API keys, not JWTs. The standalone
  // official Storage client lets us authenticate with the `apikey` header
  // without incorrectly copying the opaque key into an Authorization bearer.
  client = new StorageClient(`${url.replace(/\/$/, "")}/storage/v1`, {
    apikey: secret,
    ...(compatibilityJwt
      ? { Authorization: `Bearer ${compatibilityJwt}` }
      : {}),
    "X-Client-Info": "haydevos-documentflow/1.0",
  });
  return client;
}

function storageFailure(operation: string, error: { message: string; name?: string }): StorageAdapterError {
  return new StorageAdapterError(
    operation,
    error.name || "STORAGE_OPERATION_FAILED",
    `Supabase Storage ${operation} failed: ${error.message}`,
  );
}

async function listFolder(
  supabase: StorageClient,
  bucket: string,
  prefix: string,
  output: StoredObjectInfo[],
): Promise<void> {
  let offset = 0;
  const limit = 1_000;
  for (;;) {
    const { data, error } = await supabase.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw storageFailure("list", error);
    for (const item of data ?? []) {
      const key = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        await listFolder(supabase, bucket, key, output);
        continue;
      }
      const metadata = item.metadata as { size?: number; mimetype?: string } | null;
      output.push({
        key,
        sizeBytes: typeof metadata?.size === "number" ? metadata.size : null,
        contentType: typeof metadata?.mimetype === "string" ? metadata.mimetype : null,
        updatedAt: item.updated_at ?? null,
      });
    }
    if ((data?.length ?? 0) < limit) return;
    offset += limit;
  }
}

export class SupabaseStorageAdapter implements StorageAdapter {
  async health(bucket: string): Promise<boolean> {
    try {
      const { data, error } = await storageClient().getBucket(bucket);
      return !error && Boolean(data) && data.public === false;
    } catch {
      return false;
    }
  }

  async put(input: PutObjectInput): Promise<void> {
    const { error } = await storageClient().from(input.bucket).upload(
      input.key,
      input.bytes,
      { contentType: input.contentType, cacheControl: "0", upsert: false },
    );
    if (error) throw storageFailure("upload", error);
  }

  async get(bucket: string, key: string): Promise<Buffer> {
    const { data, error } = await storageClient().from(bucket).download(key);
    if (error) throw storageFailure("download", error);
    return Buffer.from(await data.arrayBuffer());
  }

  async remove(bucket: string, key: string): Promise<void> {
    const { error } = await storageClient().from(bucket).remove([key]);
    if (error) throw storageFailure("remove", error);
  }

  async createSignedAccess(input: SignedAccessInput): Promise<string> {
    const { data, error } = await storageClient()
      .from(input.bucket)
      .createSignedUrl(input.key, input.expiresInSeconds, { download: input.downloadName });
    if (error) throw storageFailure("sign", error);
    return data.signedUrl;
  }

  async list(bucket: string, prefix: string): Promise<StoredObjectInfo[]> {
    const output: StoredObjectInfo[] = [];
    await listFolder(storageClient(), bucket, prefix.replace(/^\/+|\/+$/g, ""), output);
    return output;
  }
}
