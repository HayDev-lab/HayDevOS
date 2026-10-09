import postgres from "npm:postgres@3.4.7";

const MAX_ROWS = 100_000;
const MAX_CSV_BYTES = 25 * 1024 * 1024;

type ExportJob = {
  id: string;
  orgId: string;
  expiresAt: string;
};

const headers = (origin?: string): HeadersInit => ({
  "Content-Type": "application/json",
  ...(origin && allowedOrigins().includes(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        Vary: "Origin",
      }
    : {}),
});

function allowedOrigins(): string[] {
  return (Deno.env.get("HAYDEV_EDGE_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function response(body: Record<string, unknown>, status: number, origin?: string): Response {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}

function hashToken(token: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)).then((digest) =>
    Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(""),
  );
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function asDate(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value ?? "");
}

function databaseClient() {
  const connectionString = Deno.env.get("HAYDEV_EDGE_DATABASE_URL")?.trim();
  if (!connectionString) {
    throw new Error("HAYDEV_EDGE_DATABASE_URL is not configured");
  }
  // The secret must point to the restricted haydev_runtime transaction pooler
  // URL. A schema-owner/DIRECT_URL secret is intentionally not accepted here.
  return postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: "require",
  });
}

function storageCredentials(): { url: string; key: string; bucket: string } {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const key = Deno.env.get("HAYDEV_EDGE_STORAGE_KEY")?.trim();
  const bucket = Deno.env.get("HAYDEV_DOCUMENT_BUCKET")?.trim() || "haydev-documents";
  if (!url || !key) throw new Error("Supabase Edge Storage credentials are not configured");
  return { url: url.replace(/\/$/, ""), key, bucket };
}

function storageObjectUrl(baseUrl: string, bucket: string, key: string): string {
  const encodedPath = key.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function uploadCsv(csv: string, bucket: string, key: string): Promise<void> {
  const { url, key: credential } = storageCredentials();
  const bytes = new TextEncoder().encode(csv);
  const compatibilityJwt = Deno.env.get("HAYDEV_EDGE_STORAGE_AUTH_JWT")?.trim();
  if (bytes.byteLength > MAX_CSV_BYTES) throw new Error("EXPORT_TOO_LARGE");
  const result = await fetch(storageObjectUrl(url, bucket, key), {
    method: "POST",
    headers: {
      apikey: credential,
      ...(compatibilityJwt ? { Authorization: `Bearer ${compatibilityJwt}` } : {}),
      "Content-Type": "text/csv; charset=utf-8",
      "x-upsert": "false",
      "cache-control": "no-store",
    },
    body: bytes,
  });
  if (!result.ok) {
    await result.body?.cancel();
    throw new Error("STORAGE_UPLOAD_FAILED");
  }
}

async function removeCsv(bucket: string, key: string): Promise<void> {
  try {
    const { url, key: credential } = storageCredentials();
    const compatibilityJwt = Deno.env.get("HAYDEV_EDGE_STORAGE_AUTH_JWT")?.trim();
    await fetch(storageObjectUrl(url, bucket, key), {
      method: "DELETE",
      headers: {
        apikey: credential,
        ...(compatibilityJwt ? { Authorization: `Bearer ${compatibilityJwt}` } : {}),
      },
    });
  } catch {
    // The durable job is still marked failed; reconciliation can remove a
    // leftover object without exposing provider errors to the client.
  }
}

async function claimJob(sql: ReturnType<typeof postgres>, jobId: string, tokenHash: string): Promise<ExportJob | null> {
  const rows = await sql<ExportJob[]>`
    UPDATE "ExportJob"
       SET "status" = 'RUNNING', "startedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ${jobId}
       AND "kind" = 'LEADS_CSV'
       AND "tokenHash" = ${tokenHash}
       AND "status" = 'QUEUED'
       AND "expiresAt" > CURRENT_TIMESTAMP
     RETURNING "id", "orgId", "expiresAt"
  `;
  return rows[0] ?? null;
}

async function failJob(sql: ReturnType<typeof postgres>, jobId: string, errorCode: string): Promise<void> {
  await sql`
    UPDATE "ExportJob"
       SET "status" = 'FAILED', "errorCode" = ${errorCode},
           "errorMessage" = 'The Edge export worker could not complete the job',
           "completedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ${jobId} AND "status" = 'RUNNING'
  `;
}

async function runExport(sql: ReturnType<typeof postgres>, job: ExportJob): Promise<{ rowCount: number; key: string; bucket: string }> {
  const rows = await sql`
    SELECT
      l."id",
      l."name",
      l."company",
      l."email",
      l."phone",
      l."source",
      l."stage",
      COALESCE(u."name", u."email", '') AS "owner",
      l."value"::text AS "value",
      l."currency",
      l."createdAt"
    FROM "Lead" l
    LEFT JOIN "User" u ON u."id" = l."ownerId"
    WHERE l."orgId" = ${job.orgId} AND l."archivedAt" IS NULL
    ORDER BY l."createdAt" ASC, l."id" ASC
    LIMIT ${MAX_ROWS}
  `;

  const output: string[] = [
    ["id", "name", "company", "email", "phone", "source", "stage", "owner", "value", "currency", "createdAt"]
      .map(csvCell)
      .join(","),
  ];
  for (const row of rows) {
    output.push([
      row.id,
      row.name,
      row.company,
      row.email,
      row.phone,
      row.source,
      row.stage,
      row.owner,
      row.value,
      row.currency,
      asDate(row.createdAt),
    ].map(csvCell).join(","));
  }

  const bucket = Deno.env.get("HAYDEV_DOCUMENT_BUCKET")?.trim() || "haydev-documents";
  const key = `organizations/${job.orgId}/exports/leados-${job.id}.csv`;
  const csv = `\uFEFF${output.join("\r\n")}`;
  await uploadCsv(csv, bucket, key);
  return { rowCount: rows.length, key, bucket };
}

async function handle(req: Request): Promise<Response> {
  const origin = req.headers.get("origin") ?? undefined;
  if (origin && !allowedOrigins().includes(origin)) return response({ error: "ORIGIN_NOT_ALLOWED" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST") return response({ error: "METHOD_NOT_ALLOWED" }, 405, origin);

  let payload: { jobId?: unknown; token?: unknown };
  try {
    payload = await req.json();
  } catch {
    return response({ error: "INVALID_JSON" }, 400, origin);
  }
  const jobId = typeof payload.jobId === "string" ? payload.jobId.trim() : "";
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!/^[A-Za-z0-9_-]{20,160}$/.test(jobId) || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return response({ error: "INVALID_EXPORT_TOKEN" }, 401, origin);
  }

  const sql = databaseClient();
  let storage: { bucket: string; key: string } | undefined;
  try {
    const claimed = await claimJob(sql, jobId, await hashToken(token));
    if (!claimed) return response({ error: "EXPORT_JOB_UNAVAILABLE" }, 409, origin);
    const result = await runExport(sql, claimed);
    storage = { bucket: result.bucket, key: result.key };
    await sql`
      UPDATE "ExportJob"
         SET "status" = 'SUCCEEDED', "storageBucket" = ${result.bucket},
             "storageKey" = ${result.key}, "rowCount" = ${result.rowCount},
             "completedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ${claimed.id} AND "status" = 'RUNNING'
    `;
    return response({ jobId: claimed.id, status: "SUCCEEDED", rowCount: result.rowCount }, 200, origin);
  } catch (error) {
    if (storage) await removeCsv(storage.bucket, storage.key);
    try {
      await failJob(sql, jobId, error instanceof Error && error.message === "EXPORT_TOO_LARGE" ? "EXPORT_TOO_LARGE" : "EDGE_EXPORT_FAILED");
    } catch {
      // Do not replace the original failure with a database cleanup failure.
    }
    return response({ error: "EDGE_EXPORT_FAILED" }, 500, origin);
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

Deno.serve(handle);
