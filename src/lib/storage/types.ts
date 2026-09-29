import "server-only";

export interface StoredObjectInfo {
  key: string;
  sizeBytes: number | null;
  contentType: string | null;
  updatedAt: string | null;
}

export interface PutObjectInput {
  bucket: string;
  key: string;
  bytes: Uint8Array;
  contentType: string;
}

export interface SignedAccessInput {
  bucket: string;
  key: string;
  expiresInSeconds: number;
  downloadName: string;
}

export interface StorageAdapter {
  health(bucket: string): Promise<boolean>;
  put(input: PutObjectInput): Promise<void>;
  get(bucket: string, key: string): Promise<Buffer>;
  remove(bucket: string, key: string): Promise<void>;
  createSignedAccess(input: SignedAccessInput): Promise<string>;
  list(bucket: string, prefix: string): Promise<StoredObjectInfo[]>;
}

export class StorageAdapterError extends Error {
  constructor(
    public readonly operation: string,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StorageAdapterError";
  }
}
