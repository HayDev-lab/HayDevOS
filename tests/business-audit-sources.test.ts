import { describe, expect, test } from "bun:test";

import { auditSourceInputs, emptyBusinessContext, normalizeAuditUrl, snapshotBusinessContext } from "../src/lib/business-audit/context";
import { extractAuditPage, isPublicAuditAddress, scanAuditSources } from "../src/lib/business-audit/sources";

const html = `<html><head><title>Armenian bakery</title><meta property="og:description" content="Bread &amp; pastry in Yerevan"></head>
<body><script>privateScript()</script><style>hidden</style><h1>Fresh bread</h1><p>Daily pastry #bakery #Երևան</p></body></html>`;
const page = { status: 200, contentType: "text/html; charset=utf-8", body: html };
const publicAddress = { address: "93.184.215.14", family: 4 };

describe("business audit sources", () => {
  test("accepts pasted domains, removes fragments and deduplicates links", () => {
    const context = { ...emptyBusinessContext(), website: "example.com/#about", socialUrls: [" https://example.com/ ", "https://social.example/profile", ""] };
    expect(auditSourceInputs(context)).toEqual([
      { kind: "website", url: "https://example.com/" },
      { kind: "social", url: "https://social.example/profile" },
    ]);
    for (const url of ["http://example.com", "https://user:password@example.com", "https://example.com:8080", "javascript:alert(1)"]) {
      expect(() => normalizeAuditUrl(url)).toThrow();
    }
  });

  test("report context is a snapshot of URLs, notes and evidence", () => {
    const draft = { ...emptyBusinessContext(), name: "Bakery", socialUrls: ["https://example.com/profile"], sources: [{ url: "https://example.com", kind: "website" as const, status: "available" as const, checkedAt: "2026-10-10", headings: ["Bread"] }] };
    const report = snapshotBusinessContext(draft);
    draft.name = "Changed";
    draft.socialUrls[0] = "https://other.example";
    draft.sources[0].headings[0] = "Changed";
    expect(report.name).toBe("Bakery");
    expect(report.socialUrls[0]).toBe("https://example.com/profile");
    expect(report.sources[0].headings?.[0]).toBe("Bread");
  });

  test("extracts business metadata, headings and public hashtags without scripts", () => {
    const result = extractAuditPage(page);
    expect(result.status).toBe("available");
    expect(result.title).toBe("Armenian bakery");
    expect(result.description).toBe("Bread & pastry in Yerevan");
    expect(result.headings).toEqual(["Fresh bread"]);
    expect(result.hashtags).toEqual(["#bakery", "#Երևան"]);
    expect(result.excerpt).not.toContain("privateScript");
    expect(result.excerpt).not.toContain("hidden");
    expect(extractAuditPage({ ...page, body: `<body>${"x".repeat(8000)}</body>` }).excerpt?.length).toBe(2400);
  });

  test("represents sign-in walls, errors and non-text pages honestly", () => {
    expect(extractAuditPage({ ...page, status: 403 })).toEqual({ status: "restricted" });
    expect(extractAuditPage({ ...page, body: "<title>Log in • Instagram</title><body>Sign in</body>" })).toEqual({ status: "restricted" });
    expect(extractAuditPage({ ...page, body: "<title>Just a moment...</title><body>Challenge</body>" })).toEqual({ status: "restricted" });
    expect(extractAuditPage({ ...page, status: 404 })).toEqual({ status: "unavailable" });
    expect(extractAuditPage({ ...page, contentType: "application/pdf" })).toEqual({ status: "unavailable" });
    expect(extractAuditPage({ ...page, body: "<script>empty()</script>" })).toEqual({ status: "unavailable" });
  });

  test("blocks loopback, private, metadata, multicast and mapped IPv6 addresses", () => {
    for (const address of ["127.0.0.1", "10.2.3.4", "169.254.169.254", "172.31.1.1", "192.168.1.1", "100.64.0.1", "224.1.1.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::"]) {
      expect(isPublicAuditAddress(address)).toBe(false);
    }
    expect(isPublicAuditAddress("8.8.8.8")).toBe(true);
    expect(isPublicAuditAddress("2606:4700:4700::1111")).toBe(true);
  });

  test("preflights all hosts before any HTTP request and pins a validated address", async () => {
    let reads = 0;
    const deps = {
      resolve: async (hostname: string) => [hostname === "private.example" ? { address: "127.0.0.1", family: 4 } : publicAddress],
      read: async (_url: URL, address: { address: string; family: number }) => { reads++; expect(address).toEqual(publicAddress); return page; },
    };
    await expect(scanAuditSources([{ kind: "website", url: "https://public.example" }, { kind: "social", url: "https://private.example" }], deps)).rejects.toThrow("public HTTPS");
    expect(reads).toBe(0);
    const results = await scanAuditSources([{ kind: "website", url: "https://public.example" }], deps);
    expect(results[0].status).toBe("available");
    expect(reads).toBe(1);
  });

  test("rejects localhost and DNS responses containing any private address", async () => {
    let reads = 0;
    const deps = { resolve: async () => [publicAddress, { address: "10.0.0.1", family: 4 }], read: async () => { reads++; return page; } };
    for (const url of ["https://localhost", "https://127.0.0.1", "https://[::1]", "https://mixed.example"]) {
      await expect(scanAuditSources([{ kind: "website", url }], deps)).rejects.toThrow();
    }
    expect(reads).toBe(0);
  });

  test("revalidates redirects before following them", async () => {
    let reads = 0;
    const results = await scanAuditSources([{ kind: "website", url: "https://public.example" }], {
      resolve: async () => [publicAddress],
      read: async () => { reads++; return { ...page, status: 302, location: "https://169.254.169.254/latest/meta-data" }; },
    });
    expect(reads).toBe(1);
    expect(results[0].status).toBe("unavailable");
    expect(results[0].excerpt).toBeUndefined();
  });

  test("keeps separate success, restricted and DNS failure results", async () => {
    const results = await scanAuditSources([
      { kind: "website", url: "https://business.example" }, { kind: "social", url: "https://social.example" }, { kind: "social", url: "https://missing.example" },
    ], {
      resolve: async (hostname) => { if (hostname === "missing.example") throw new Error("ENOTFOUND"); return [publicAddress]; },
      read: async (url) => ({ ...page, status: url.hostname === "social.example" ? 403 : 200 }),
    });
    expect(results.map((result) => result.status)).toEqual(["available", "restricted", "unavailable"]);
    expect(results.every((result) => !Number.isNaN(Date.parse(result.checkedAt)))).toBe(true);
  });
});
