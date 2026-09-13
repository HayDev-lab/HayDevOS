import { env } from "cloudflare:workers";

export function leadsDatabase(): D1Database {
  if (!env.DB) throw new Error("Lead storage unavailable");
  return env.DB;
}
