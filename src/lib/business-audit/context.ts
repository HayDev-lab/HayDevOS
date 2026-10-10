export interface AuditSourceInput {
  url: string;
  kind: "website" | "social";
}

export interface AuditSourceResult extends AuditSourceInput {
  finalUrl?: string;
  status: "available" | "restricted" | "unavailable";
  checkedAt: string;
  title?: string;
  description?: string;
  excerpt?: string;
  headings?: string[];
  hashtags?: string[];
}

export interface AuditBusinessContext {
  name: string;
  description: string;
  website: string;
  socialUrls: string[];
  sources: AuditSourceResult[];
}

export function emptyBusinessContext(): AuditBusinessContext {
  return { name: "", description: "", website: "", socialUrls: [""], sources: [] };
}

/** Accept pasted domains as well as full HTTPS links. */
export function normalizeAuditUrl(value: string): string {
  const raw = value.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("AUDIT_SOURCE_INVALID");
  }
  url.hash = "";
  return url.href;
}

export function auditSourceInputs(context: AuditBusinessContext): AuditSourceInput[] {
  const inputs: AuditSourceInput[] = [];
  const seen = new Set<string>();
  for (const [kind, values] of [["website", [context.website]], ["social", context.socialUrls]] as const) {
    for (const value of values) {
      if (!value.trim()) continue;
      const url = normalizeAuditUrl(value);
      if (seen.has(url)) continue;
      seen.add(url);
      inputs.push({ kind, url });
    }
  }
  return inputs;
}

/** A report keeps the context as it was when it was generated. */
export function snapshotBusinessContext(context: AuditBusinessContext): AuditBusinessContext {
  return structuredClone(context);
}
