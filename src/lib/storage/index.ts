import "server-only";

import { SupabaseStorageAdapter } from "./supabase-storage";

export type {
  PutObjectInput,
  SignedAccessInput,
  StorageAdapter,
  StoredObjectInfo,
} from "./types";
export { StorageAdapterError } from "./types";

let adapter: SupabaseStorageAdapter | undefined;

export function getStorage(): SupabaseStorageAdapter {
  adapter ??= new SupabaseStorageAdapter();
  return adapter;
}

export function documentBucket(): string {
  return process.env.HAYDEV_DOCUMENT_BUCKET?.trim() || "haydev-documents";
}
