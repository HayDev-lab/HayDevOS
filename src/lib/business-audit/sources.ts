import "server-only";

import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

import { ApiError } from "@/lib/api/errors";
import { normalizeAuditUrl, type AuditSourceInput, type AuditSourceResult } from "./context";

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(network, prefix, "ipv4");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2001::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");

export function isPublicAuditAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  // Only globally routed IPv6 unicast, excluding transition/documentation ranges.
  return family === 6 && /^[23]/.test(address) && !blocked.check(address, "ipv6");
}

interface Address { address: string; family: number }
interface PublicPage { status: number; location?: string; contentType: string; body: string }
interface SourceDependencies {
  resolve: (hostname: string) => Promise<Address[]>;
  read: (url: URL, address: Address, timeoutMs?: number) => Promise<PublicPage>;
}

const defaults: SourceDependencies = {
  resolve: async (hostname) => lookup(hostname, { all: true, verbatim: true }),
  read: (url, address, timeoutMs = TIMEOUT_MS) => new Promise((resolve, reject) => {
    // Pin the validated address to the TLS request, keeping the hostname for SNI.
    const req = request(url, {
      method: "GET",
      headers: { Accept: "text/html,text/plain;q=0.9", "Accept-Encoding": "identity", "User-Agent": "HayDevOS-BusinessAudit/1.0" },
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
    }, (res) => {
      res.on("error", reject);
      const status = res.statusCode ?? 0;
      const location = res.headers.location;
      const contentType = res.headers["content-type"] ?? "";
      if (status >= 300 && status < 400) {
        res.destroy();
        resolve({ status, location, contentType, body: "" });
        return;
      }
      if (status < 200 || status >= 300) {
        res.destroy();
        resolve({ status, contentType, body: "" });
        return;
      }
      if (Number(res.headers["content-length"] ?? 0) > MAX_BYTES || (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity")) {
        res.destroy(new Error("AUDIT_SOURCE_UNSUPPORTED"));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) res.destroy(new Error("AUDIT_SOURCE_TOO_LARGE"));
        else chunks.push(chunk);
      });
      res.on("end", () => resolve({ status, location, contentType, body: Buffer.concat(chunks).toString("utf8") }));
    });
    const timeout = setTimeout(() => req.destroy(new Error("AUDIT_SOURCE_TIMEOUT")), timeoutMs);
    req.on("close", () => clearTimeout(timeout));
    req.on("error", reject);
    req.end();
  }),
};

async function publicTarget(raw: string, deps: SourceDependencies): Promise<{ url: URL; address: Address }> {
  let url: URL;
  try { url = new URL(normalizeAuditUrl(raw)); }
  catch { throw new ApiError(422, "AUDIT_SOURCE_INVALID", "Use a public HTTPS URL"); }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if ((!hostname.includes(".") && !isIP(hostname)) || /(^|\.)(localhost|local|localdomain|internal|lan|test|invalid)$/.test(hostname)) {
    throw new ApiError(422, "AUDIT_SOURCE_INVALID", "Use a public HTTPS URL");
  }
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await new Promise<Address[]>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AUDIT_DNS_TIMEOUT")), 4_000);
    deps.resolve(hostname).then(resolve, reject).finally(() => clearTimeout(timer));
  });
  if (!addresses.length || addresses.some((entry) => !isPublicAuditAddress(entry.address))) {
    throw new ApiError(422, "AUDIT_SOURCE_INVALID", "Use a public HTTPS URL");
  }
  return { url, address: addresses[0] };
}

function text(value: string): string {
  return value.replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
    const number = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
    return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : " ";
  }).replace(/&(?:amp|quot|apos|lt|gt|nbsp);/gi, (entity) => ({
    "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " ",
  })[entity.toLowerCase()] ?? " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function extractAuditPage(page: PublicPage): Omit<AuditSourceResult, "url" | "kind" | "checkedAt"> {
  if ([401, 403, 429].includes(page.status)) return { status: "restricted" };
  if (page.status < 200 || page.status >= 300 || !/text\/(html|plain)|application\/xhtml\+xml/i.test(page.contentType)) return { status: "unavailable" };
  const clean = page.body.replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const title = text(clean.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").slice(0, 300);
  let description = "";
  for (const tag of clean.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!/(?:name|property)\s*=\s*["'](?:description|og:description)["']/i.test(tag)) continue;
    description = text(tag.match(/content\s*=\s*(["'])([\s\S]*?)\1/i)?.[2] ?? "").slice(0, 1000);
    if (description) break;
  }
  const body = text(clean.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, " "));
  if (/^(?:log\s?in|sign\s?in|login|войти|вход|մուտք)(?:\b|\s)/i.test(title) || /just a moment|security check|access denied|verify you are human/i.test(title)) return { status: "restricted" };
  if (!body && !description) return { status: "unavailable" };
  const headings = [...clean.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)].map((match) => text(match[1]).slice(0, 160)).filter(Boolean).slice(0, 8);
  const hashtags = [...new Set(body.match(/#[\p{L}\p{N}_]{2,50}/gu) ?? [])].slice(0, 12);
  return { status: "available", title: title || undefined, description: description || undefined, excerpt: body.slice(0, 2400), headings, hashtags };
}

export async function scanAuditSources(inputs: AuditSourceInput[], deps: SourceDependencies = defaults): Promise<AuditSourceResult[]> {
  const started = Date.now();
  if (!inputs.length || inputs.length > 6) throw new ApiError(422, "AUDIT_SOURCE_INVALID", "Provide one to six sources");
  // Preflight all addresses before making any outbound HTTP request.
  const targets = await Promise.all(inputs.map(async (input) => {
    try { return await publicTarget(input.url, deps); }
    catch (error) { if (error instanceof ApiError) throw error; return null; }
  }));
  return Promise.all(inputs.map(async (input, index) => {
    const result: AuditSourceResult = { ...input, checkedAt: new Date().toISOString(), status: "unavailable" };
    try {
      let target = targets[index];
      if (!target) return result;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const remaining = 45_000 - (Date.now() - started);
        if (remaining <= 0) return result;
        const page = await deps.read(target.url, target.address, Math.min(TIMEOUT_MS, remaining));
        if (page.status >= 300 && page.status < 400) {
          if (!page.location || hop === MAX_REDIRECTS) return result;
          target = await publicTarget(new URL(page.location, target.url).href, deps);
          continue;
        }
        return { ...result, finalUrl: target.url.href, ...extractAuditPage(page) };
      }
    } catch { /* A failed source never becomes invented evidence. */ }
    return result;
  }));
}
