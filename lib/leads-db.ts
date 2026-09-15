import { env } from "cloudflare:workers";

/**
 * The leads table lives in D1. Fresh local/miniflare environments (sandbox
 * preview, deployed preview containers) start with an empty SQLite file, so
 * the schema is ensured once per isolate before the first enquiry is written.
 * Deployments that already applied the drizzle migration are unaffected:
 * CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS are no-ops there.
 */
let schemaReady: Promise<void> | null = null;

async function ensureLeadsSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS leads ("
      + "id text PRIMARY KEY NOT NULL, "
      + "name text NOT NULL, "
      + "email text NOT NULL, "
      + "message text NOT NULL, "
      + "consent_version text NOT NULL, "
      + "created_at integer NOT NULL)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS leads_email_created_idx ON leads (email, created_at)",
    ),
  ]);
}

export async function leadsDatabase(): Promise<D1Database> {
  if (!env.DB) throw new Error("Lead storage unavailable");
  const db = env.DB;
  if (!schemaReady) {
    schemaReady = ensureLeadsSchema(db).catch((error) => {
      // Retry the schema on the next enquiry instead of caching the failure.
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  return db;
}
