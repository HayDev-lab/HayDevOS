import "server-only";

import { lookup } from "node:dns/promises";
import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { ApiError } from "@/lib/api/errors";
import type { AuthContext } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export const MAX_COMPETITORS = 5;
export const DEFAULT_CADENCE_DAYS = 3;
export const MAX_FETCH_BYTES = 1_500_000;
export const MAX_CONTENT_CHARS = 50_000;
export const COMPETITOR_SOURCE_TYPES = ["auto", "webpage", "rss", "sitemap", "json"] as const;
export type CompetitorSourceType = (typeof COMPETITOR_SOURCE_TYPES)[number];

const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "HayDevOS-CompetitorMonitor/1.0 (+https://haydevos.com)";
const STOP_WORDS = new Set([
  "about", "after", "also", "been", "from", "have", "into", "more", "that", "their", "there", "this", "with",
  "для", "как", "когда", "может", "новый", "новая", "новое", "наша", "наши", "после", "продукт", "также", "это", "этот", "этого",
  "and", "the", "you", "your", "our", "are", "was", "were", "will", "can", "not", "all", "has", "its", "what", "where",
]);

export interface CompetitorInput {
  name: string;
  url: string;
  sourceType?: CompetitorSourceType;
  cadenceDays?: number;
}

export interface CompetitorMonitorDto {
  id: string;
  name: string;
  url: string;
  sourceType: CompetitorSourceType;
  enabled: boolean;
  cadenceDays: number;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  lastStatus: string;
  lastError: string | null;
  latestSnapshot: { fetchedAt: string; title: string | null; contentHash: string } | null;
}

export interface CompetitorAnalysisDto {
  id: string;
  periodKey: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  provider: string;
  summary: string;
  details: unknown;
  error: string | null;
  createdAt: string;
}

export interface CompetitorRunResult {
  checked: number;
  changed: number;
  unchanged: number;
  blocked: number;
  errors: number;
  analysisId: string | null;
}

function trimText(value: string, max = MAX_CONTENT_CHARS): string {
  return value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Math.min(Number(code), 0x10ffff)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Math.min(parseInt(code, 16), 0x10ffff)));
}

function isPrivateIp(address: string): boolean {
  if (isIP(address) === 4) {
    const octets = address.split(".").map(Number);
    return octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) || octets[0] === 0;
  }
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

export async function assertPublicCompetitorUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new ApiError(422, "COMPETITOR_URL_INVALID", "Competitor URL is invalid");
  }
  if (parsed.protocol !== "https:") throw new ApiError(422, "COMPETITOR_HTTPS_REQUIRED", "Competitor URL must use HTTPS");
  if (parsed.username || parsed.password || parsed.hash) throw new ApiError(422, "COMPETITOR_URL_UNSAFE", "Competitor URL must not contain credentials or a fragment");
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname === "metadata.google.internal") {
    throw new ApiError(422, "COMPETITOR_PRIVATE_TARGET", "Private and local targets are not allowed");
  }
  if (isIP(hostname) && isPrivateIp(hostname)) throw new ApiError(422, "COMPETITOR_PRIVATE_TARGET", "Private IP targets are not allowed");
  if (!isIP(hostname)) {
    try {
      const addresses = await lookup(hostname, { all: true, verbatim: true });
      if (addresses.some((address) => isPrivateIp(address.address))) throw new ApiError(422, "COMPETITOR_PRIVATE_TARGET", "Private IP targets are not allowed");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(422, "COMPETITOR_HOST_UNRESOLVED", "Competitor host could not be resolved");
    }
  }
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  parsed.searchParams.sort();
  parsed.hash = "";
  return parsed;
}

async function readBoundedBody(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_FETCH_BYTES) throw new Error("COMPETITOR_RESPONSE_TOO_LARGE");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FETCH_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error("COMPETITOR_RESPONSE_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

async function fetchPublicText(url: URL): Promise<{ url: URL; response: Response; body: string }> {
  let current = url;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        headers: { accept: "text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/xml,application/json;q=0.9,*/*;q=0.1", "user-agent": USER_AGENT },
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirect === MAX_REDIRECTS) throw new Error("COMPETITOR_TOO_MANY_REDIRECTS");
        current = await assertPublicCompetitorUrl(new URL(location, current).toString());
        continue;
      }
      const body = await readBoundedBody(response);
      return { url: current, response, body };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("COMPETITOR_FETCH_TIMEOUT");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("COMPETITOR_TOO_MANY_REDIRECTS");
}

function htmlText(raw: string): string {
  const withoutNoise = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|main|li|h[1-6]|br|tr|item|entry)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return withoutNoise.split(/\n+/).map((line) => decodeEntities(line).replace(/\s+/g, " ").trim()).filter((line) => line.length >= 3).join("\n").slice(0, MAX_CONTENT_CHARS);
}

function firstTag(raw: string, tag: string): string | null {
  const match = raw.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? trimText(decodeEntities(match[1].replace(/<[^>]+>/g, " ")), 500) : null;
}

function metaDescription(raw: string): string | null {
  const match = raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) ?? raw.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  return match ? trimText(decodeEntities(match[1]), 500) : null;
}

export function extractCompetitorSnapshot(raw: string, contentType: string | null, sourceType: CompetitorSourceType = "auto") {
  const lower = raw.trimStart().toLowerCase();
  const isFeed = sourceType === "rss" || sourceType === "sitemap" || /rss|atom|xml|json/.test(contentType ?? "") || lower.startsWith("<?xml") || lower.startsWith("<rss") || lower.startsWith("<feed") || lower.startsWith("<urlset") || lower.startsWith("{") || lower.startsWith("[");
  const title = firstTag(raw, isFeed && !lower.startsWith("<html") ? "title" : "title") ?? (isFeed ? firstTag(raw, "name") : null);
  const description = metaDescription(raw) ?? firstTag(raw, "description");
  const text = isFeed ? htmlText(raw) : htmlText(raw);
  if (!text.trim()) throw new Error("COMPETITOR_EMPTY_CONTENT");
  return { title, description, text, isFeed };
}

export function normalizeCompetitorText(value: string): string {
  return value.split(/\n+/).map((line) => line.trim()).filter((line) => line.length >= 3).join("\n").slice(0, MAX_CONTENT_CHARS);
}

export function hashCompetitorSnapshot(input: { title: string | null; description: string | null; text: string }): string {
  return createHash("sha256").update(JSON.stringify(input), "utf8").digest("hex");
}

export function diffCompetitorText(previous: string | null, current: string): { added: string[]; removed: string[] } {
  const before = new Set((previous ?? "").split(/\n+/).map((line) => line.trim()).filter(Boolean));
  const after = new Set(current.split(/\n+/).map((line) => line.trim()).filter(Boolean));
  return {
    added: [...after].filter((line) => !before.has(line)).slice(0, 24),
    removed: [...before].filter((line) => !after.has(line)).slice(0, 24),
  };
}

function topKeywords(lines: string[]): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) {
    for (const word of line.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]{3,}/gu) ?? []) {
      if (STOP_WORDS.has(word) || /^\d+$/.test(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([word]) => word);
}

export interface CompetitorAnalysisInput {
  periodStart: string;
  periodEnd: string;
  competitors: Array<{ name: string; url: string; status: string; changed: boolean; added: string[]; removed: string[]; title: string | null; error?: string | null }>;
}

export function buildCompetitorAnalysis(input: CompetitorAnalysisInput): { summary: string; details: string; provider: string } {
  const changed = input.competitors.filter((item) => item.changed);
  const blocked = input.competitors.filter((item) => item.status === "blocked");
  const errors = input.competitors.filter((item) => item.status === "error");
  const keywords = topKeywords(changed.flatMap((item) => item.added));
  const summary = changed.length
    ? `${changed.length} из ${input.competitors.length} конкурентов изменили публичный контент за период.`
    : `За период существенных изменений в публичном контенте не обнаружено (${input.competitors.length} конкурентов проверено).`;
  const recommendations = changed.length
    ? changed.map((item) => `Проверить изменения у «${item.name}» и сравнить с нашими предложениями.`)
    : ["Продолжать мониторинг и добавить RSS/API для динамических источников при необходимости."];
  const details = {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    provider: "local-heuristic",
    changedCount: changed.length,
    blockedCount: blocked.length,
    errorCount: errors.length,
    themes: keywords,
    recommendations,
    competitors: input.competitors,
  };
  return { summary, details: JSON.stringify(details), provider: "local-heuristic" };
}

function toMonitorDto(row: {
  id: string; name: string; url: string; sourceType: string; enabled: boolean; cadenceDays: number;
  lastCheckedAt: Date | null; nextCheckAt: Date | null; lastStatus: string; lastError: string | null;
  snapshots: Array<{ fetchedAt: Date; title: string | null; contentHash: string }>;
}): CompetitorMonitorDto {
  return {
    id: row.id, name: row.name, url: row.url,
    sourceType: COMPETITOR_SOURCE_TYPES.includes(row.sourceType as CompetitorSourceType) ? row.sourceType as CompetitorSourceType : "auto",
    enabled: row.enabled, cadenceDays: row.cadenceDays,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    nextCheckAt: row.nextCheckAt?.toISOString() ?? null,
    lastStatus: row.lastStatus, lastError: row.lastError,
    latestSnapshot: row.snapshots[0] ? { fetchedAt: row.snapshots[0].fetchedAt.toISOString(), title: row.snapshots[0].title, contentHash: row.snapshots[0].contentHash } : null,
  };
}

export async function listCompetitorMonitors(context: AuthContext): Promise<CompetitorMonitorDto[]> {
  const rows = await getDb().competitorMonitor.findMany({
    where: { orgId: context.orgId }, orderBy: { createdAt: "asc" },
    include: { snapshots: { orderBy: { fetchedAt: "desc" }, take: 1, select: { fetchedAt: true, title: true, contentHash: true } } },
  });
  return rows.map(toMonitorDto);
}

export async function listCompetitorAnalyses(context: AuthContext, take = 12): Promise<CompetitorAnalysisDto[]> {
  const rows = await getDb().competitorAnalysis.findMany({ where: { orgId: context.orgId }, orderBy: { periodEnd: "desc" }, take: Math.min(Math.max(take, 1), 50) });
  return rows.map((row) => ({ id: row.id, periodKey: row.periodKey, periodStart: row.periodStart.toISOString(), periodEnd: row.periodEnd.toISOString(), status: row.status, provider: row.provider, summary: row.summary, details: (() => { try { return JSON.parse(row.details); } catch { return {}; } })(), error: row.error, createdAt: row.createdAt.toISOString() }));
}

export async function createCompetitorMonitor(context: AuthContext, input: CompetitorInput): Promise<CompetitorMonitorDto> {
  const db = getDb();
  const count = await db.competitorMonitor.count({ where: { orgId: context.orgId } });
  if (count >= MAX_COMPETITORS) throw new ApiError(409, "COMPETITOR_LIMIT_REACHED", `Only ${MAX_COMPETITORS} competitors can be monitored`);
  const url = (await assertPublicCompetitorUrl(input.url)).toString();
  const duplicate = await db.competitorMonitor.findFirst({ where: { orgId: context.orgId, url }, select: { id: true } });
  if (duplicate) throw new ApiError(409, "COMPETITOR_ALREADY_EXISTS", "This competitor URL is already monitored");
  const now = new Date();
  const row = await db.competitorMonitor.create({ data: { orgId: context.orgId, createdById: context.userId, name: trimText(input.name, 120) || url, url, sourceType: input.sourceType ?? "auto", cadenceDays: input.cadenceDays ?? DEFAULT_CADENCE_DAYS, nextCheckAt: now }, include: { snapshots: { orderBy: { fetchedAt: "desc" }, take: 1, select: { fetchedAt: true, title: true, contentHash: true } } } });
  return toMonitorDto(row);
}

export async function updateCompetitorMonitor(context: AuthContext, id: string, input: Partial<CompetitorInput> & { enabled?: boolean }): Promise<CompetitorMonitorDto> {
  const db = getDb();
  const existing = await db.competitorMonitor.findFirst({ where: { id, orgId: context.orgId } });
  if (!existing) throw new ApiError(404, "COMPETITOR_NOT_FOUND", "Competitor monitor not found");
  const url = input.url === undefined ? existing.url : (await assertPublicCompetitorUrl(input.url)).toString();
  if (url !== existing.url) {
    const duplicate = await db.competitorMonitor.findFirst({ where: { orgId: context.orgId, url, id: { not: existing.id } }, select: { id: true } });
    if (duplicate) throw new ApiError(409, "COMPETITOR_ALREADY_EXISTS", "This competitor URL is already monitored");
  }
  const cadenceDays = input.cadenceDays ?? existing.cadenceDays;
  const row = await db.competitorMonitor.update({ where: { id: existing.id }, data: { ...(input.name !== undefined ? { name: trimText(input.name, 120) || existing.name } : {}), url, ...(input.sourceType !== undefined ? { sourceType: input.sourceType } : {}), ...(input.enabled !== undefined ? { enabled: input.enabled } : {}), cadenceDays, ...((input.cadenceDays !== undefined || input.url !== undefined || input.enabled === true) ? { nextCheckAt: new Date() } : {}) }, include: { snapshots: { orderBy: { fetchedAt: "desc" }, take: 1, select: { fetchedAt: true, title: true, contentHash: true } } } });
  return toMonitorDto(row);
}

export async function deleteCompetitorMonitor(context: AuthContext, id: string): Promise<void> {
  const result = await getDb().competitorMonitor.deleteMany({ where: { id, orgId: context.orgId } });
  if (result.count !== 1) throw new ApiError(404, "COMPETITOR_NOT_FOUND", "Competitor monitor not found");
}

function nextRun(now: Date, days: number): Date { return new Date(now.getTime() + days * 86_400_000); }

async function processMonitor(orgId: string, id: string, now: Date, force: boolean): Promise<{ status: string; changed: boolean; added: string[]; removed: string[]; title: string | null; error: string | null; name: string; url: string }> {
  const db = getDb();
  const monitor = await db.competitorMonitor.findFirst({ where: { id, orgId } });
  if (!monitor) throw new ApiError(404, "COMPETITOR_NOT_FOUND", "Competitor monitor not found");
  if (!monitor.enabled) return { status: "blocked", changed: false, added: [], removed: [], title: null, error: "MONITOR_DISABLED", name: monitor.name, url: monitor.url };
  const claimed = await db.competitorMonitor.updateMany({ where: { id, orgId, AND: [
    ...(force ? [] : [{ OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }] }]),
    { OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
  ] }, data: { leaseUntil: new Date(now.getTime() + 15 * 60_000) } });
  if (claimed.count !== 1) return { status: "blocked", changed: false, added: [], removed: [], title: null, error: "MONITOR_ALREADY_RUNNING", name: monitor.name, url: monitor.url };
  try {
    const target = await assertPublicCompetitorUrl(monitor.url);
    const result = await fetchPublicText(target);
    if (!result.response.ok) throw new Error(`COMPETITOR_HTTP_${result.response.status}`);
    const extracted = extractCompetitorSnapshot(result.body, result.response.headers.get("content-type"), monitor.sourceType as CompetitorSourceType);
    const text = normalizeCompetitorText(extracted.text);
    const hash = hashCompetitorSnapshot({ title: extracted.title, description: extracted.description, text });
    const previous = await db.competitorSnapshot.findFirst({ where: { monitorId: monitor.id }, orderBy: { fetchedAt: "desc" }, select: { contentText: true, contentHash: true } });
    const changed = previous?.contentHash !== hash;
    const diff = diffCompetitorText(previous?.contentText ?? null, text);
    if (changed) await db.competitorSnapshot.create({ data: { monitorId: monitor.id, orgId, sourceUrl: result.url.toString(), statusCode: result.response.status, contentType: result.response.headers.get("content-type"), title: extracted.title, description: extracted.description, contentHash: hash, contentText: text, contentBytes: Buffer.byteLength(result.body, "utf8") } });
    await db.competitorMonitor.update({ where: { id: monitor.id }, data: { lastCheckedAt: now, nextCheckAt: nextRun(now, monitor.cadenceDays), lastStatus: changed ? "changed" : "unchanged", lastError: null, leaseUntil: null } });
    return { status: changed ? "changed" : "unchanged", changed, added: diff.added, removed: diff.removed, title: extracted.title, error: null, name: monitor.name, url: monitor.url };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "COMPETITOR_FETCH_FAILED";
    const status = message.includes("PRIVATE_TARGET") || message.includes("HTTPS_REQUIRED") ? "blocked" : "error";
    await db.competitorMonitor.update({ where: { id: monitor.id }, data: { lastCheckedAt: now, nextCheckAt: nextRun(now, monitor.cadenceDays), lastStatus: status, lastError: message, leaseUntil: null } });
    return { status, changed: false, added: [], removed: [], title: null, error: message, name: monitor.name, url: monitor.url };
  }
}

export async function runCompetitorMonitoring(orgId: string, options: { monitorId?: string; force?: boolean } = {}): Promise<CompetitorRunResult> {
  const db = getDb();
  const now = new Date();
  const monitors = await db.competitorMonitor.findMany({ where: { orgId, ...(options.monitorId ? { id: options.monitorId } : {}), ...(options.force ? {} : { enabled: true, OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }] }) }, orderBy: { createdAt: "asc" }, take: MAX_COMPETITORS });
  if (!monitors.length) return { checked: 0, changed: 0, unchanged: 0, blocked: 0, errors: 0, analysisId: null };
  const results = await Promise.all(monitors.map((monitor) => processMonitor(orgId, monitor.id, now, options.force === true)));
  const periodStart = new Date(now.getTime() - DEFAULT_CADENCE_DAYS * 86_400_000);
  const periodKey = now.toISOString().slice(0, 10);
  const snapshots = await db.competitorSnapshot.findMany({ where: { orgId, fetchedAt: { gte: periodStart } }, orderBy: { fetchedAt: "desc" }, take: 200 });
  const report = buildCompetitorAnalysis({ periodStart: periodStart.toISOString(), periodEnd: now.toISOString(), competitors: monitors.map((monitor) => { const result = results.find((item) => item.name === monitor.name && item.url === monitor.url); const snap = snapshots.find((item) => item.monitorId === monitor.id); return { name: monitor.name, url: monitor.url, status: result?.status ?? "unchanged", changed: result?.changed ?? false, added: result?.added ?? [], removed: result?.removed ?? [], title: result?.title ?? snap?.title ?? null, error: result?.error ?? null }; }) });
  const analysis = await db.competitorAnalysis.upsert({ where: { orgId_periodKey: { orgId, periodKey } }, create: { orgId, periodKey, periodStart, periodEnd: now, status: "completed", provider: report.provider, summary: report.summary, details: report.details }, update: { periodStart, periodEnd: now, status: "completed", provider: report.provider, summary: report.summary, details: report.details, error: null } });
  return { checked: results.length, changed: results.filter((item) => item.status === "changed").length, unchanged: results.filter((item) => item.status === "unchanged").length, blocked: results.filter((item) => item.status === "blocked").length, errors: results.filter((item) => item.status === "error").length, analysisId: analysis.id };
}

export async function runCompetitorMonitoringForDueOrganizations(): Promise<{ organizations: number; reports: number; errors: number }> {
  const db = getDb();
  const organizations = await db.organization.findMany({ where: { competitorMonitors: { some: { enabled: true, OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: new Date() } }] } } }, select: { id: true } });
  let reports = 0;
  let errors = 0;
  for (const organization of organizations) {
    try { const result = await runCompetitorMonitoring(organization.id); if (result.analysisId) reports += 1; }
    catch { errors += 1; }
  }
  return { organizations: organizations.length, reports, errors };
}
