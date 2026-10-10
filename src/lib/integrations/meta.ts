import "server-only";

import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { AuthContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const META_PROVIDERS = ["facebook", "instagram", "whatsapp"] as const;
export type MetaProvider = (typeof META_PROVIDERS)[number];

const STATE_TTL_SECONDS = 10 * 60;
const GRAPH_VERSION = process.env.HAYDEV_META_GRAPH_VERSION?.trim() || "v26.0";

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function stateSignature(payload: string): string {
  return createHmac("sha256", env("HAYDEV_META_APP_SECRET")).update(payload, "utf8").digest("base64url");
}

export function createMetaOAuthState(context: AuthContext, provider: MetaProvider): string {
  const payload = encode(JSON.stringify({
    orgId: context.orgId,
    userId: context.userId,
    provider,
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
    nonce: randomBytes(18).toString("base64url"),
  }));
  return `${payload}.${stateSignature(payload)}`;
}

export function verifyMetaOAuthState(state: string, context: AuthContext): MetaProvider {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("META_OAUTH_STATE_INVALID");
  const expected = stateSignature(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) throw new Error("META_OAUTH_STATE_INVALID");
  let parsed: { orgId?: string; userId?: string; provider?: string; exp?: number };
  try { parsed = JSON.parse(decode(payload)) as typeof parsed; } catch { throw new Error("META_OAUTH_STATE_INVALID"); }
  if (parsed.orgId !== context.orgId || parsed.userId !== context.userId || !META_PROVIDERS.includes(parsed.provider as MetaProvider) || (parsed.exp ?? 0) < Math.floor(Date.now() / 1000)) throw new Error("META_OAUTH_STATE_INVALID");
  return parsed.provider as MetaProvider;
}

function scopes(provider: MetaProvider): string {
  const configured = process.env[`HAYDEV_META_${provider.toUpperCase()}_SCOPES`]?.trim();
  if (configured) return configured;
  if (provider === "facebook") return "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,leads_retrieval";
  if (provider === "instagram") return "instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_messages,pages_show_list";
  return "business_management,whatsapp_business_management,whatsapp_business_messaging";
}

export function metaAuthorizationUrl(state: string, provider: MetaProvider): string {
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", env("HAYDEV_META_APP_ID"));
  url.searchParams.set("redirect_uri", env("HAYDEV_META_OAUTH_REDIRECT_URI"));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes(provider));
  return url.toString();
}

export async function exchangeMetaCode(code: string, provider: MetaProvider): Promise<{ accessToken: string; expiresAt: string | null; grantedScopes: string[]; externalAccountId: string | null; externalAccountIds: string[]; displayName: string | null }> {
  const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", env("HAYDEV_META_APP_ID"));
  tokenUrl.searchParams.set("client_secret", env("HAYDEV_META_APP_SECRET"));
  tokenUrl.searchParams.set("redirect_uri", env("HAYDEV_META_OAUTH_REDIRECT_URI"));
  tokenUrl.searchParams.set("code", code);
  const response = await fetch(tokenUrl, { method: "GET", cache: "no-store" });
  const payload = await response.json() as { access_token?: string; expires_in?: number; scope?: string; error?: { message?: string } };
  if (!response.ok || !payload.access_token) throw new Error(payload.error?.message ? "META_OAUTH_TOKEN_EXCHANGE_FAILED" : "META_OAUTH_TOKEN_MISSING");
  let externalAccountId: string | null = null;
  const externalAccountIds: string[] = [];
  let displayName: string | null = null;
  try {
    const identity = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(payload.access_token)}`, { cache: "no-store" });
    const body = await identity.json() as { id?: string; name?: string };
    externalAccountId = body.id ?? null;
    if (body.id) externalAccountIds.push(body.id);
    displayName = body.name ?? null;
    if (provider !== "whatsapp") {
      const accountsResponse = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(payload.access_token)}`, { cache: "no-store" });
      const accounts = await accountsResponse.json() as { data?: Array<{ id?: string; name?: string; instagram_business_account?: { id?: string } }> };
      for (const account of accounts.data ?? []) {
        if (account.id) externalAccountIds.push(account.id);
        if (account.instagram_business_account?.id) externalAccountIds.push(account.instagram_business_account.id);
        if (!displayName && account.name) displayName = account.name;
      }
    }
  } catch {
    // Token exchange remains valid even if optional identity enrichment fails.
  }
  return {
    accessToken: payload.access_token,
    expiresAt: typeof payload.expires_in === "number" ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    grantedScopes: (payload.scope ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 100),
    externalAccountId,
    externalAccountIds: [...new Set(externalAccountIds)].slice(0, 100),
    displayName,
  };
}

function encryptionKey(): Buffer {
  const value = env("HAYDEV_INTEGRATION_ENCRYPTION_KEY");
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("HAYDEV_INTEGRATION_ENCRYPTION_KEY_INVALID");
  return key;
}

export function sealIntegrationSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function openIntegrationSecret(value: string): string {
  const [version, ivText, tagText, ciphertextText] = value.split(":");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) throw new Error("INTEGRATION_SECRET_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}

export async function storeMetaConnection(context: AuthContext, provider: MetaProvider, token: Awaited<ReturnType<typeof exchangeMetaCode>>): Promise<void> {
  const config = JSON.stringify({
    version: 1,
    tokenCiphertext: sealIntegrationSecret(token.accessToken),
    tokenExpiresAt: token.expiresAt,
    externalAccountId: token.externalAccountId,
    externalAccountIds: token.externalAccountIds,
    displayName: token.displayName,
    grantedScopes: token.grantedScopes,
    connectedByUserId: context.userId,
  });
  await getDb().integration.upsert({
    where: { orgId_provider: { orgId: context.orgId, provider } },
    create: { orgId: context.orgId, provider, status: "connected", config, lastSyncAt: new Date() },
    update: { status: "connected", config, lastSyncAt: new Date() },
  });
}

export function metaWebhookVerifyToken(): string {
  return env("HAYDEV_META_WEBHOOK_VERIFY_TOKEN");
}

export function verifyMetaWebhookSignature(body: string, header: string | null): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", env("HAYDEV_META_APP_SECRET")).update(body, "utf8").digest("hex");
  const actual = header.slice("sha256=".length);
  const actualBytes = Buffer.from(actual, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export async function findMetaIntegrationByExternalId(externalAccountId: string): Promise<{ orgId: string; provider: string } | null> {
  const rows = await getDb().integration.findMany({ where: { provider: { in: [...META_PROVIDERS] }, status: "connected" }, select: { orgId: true, provider: true, config: true } });
  for (const row of rows) {
    if (!row.config) continue;
    try {
      const parsed = JSON.parse(row.config) as { externalAccountId?: string; externalAccountIds?: string[] };
      if (parsed.externalAccountId === externalAccountId || parsed.externalAccountIds?.includes(externalAccountId)) return { orgId: row.orgId, provider: row.provider };
    } catch { /* ignore malformed legacy config */ }
  }
  return null;
}
