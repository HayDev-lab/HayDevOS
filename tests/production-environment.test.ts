import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { runtimeEnvironmentIssues } from "../src/lib/env";

function productionEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://runtime:password@db.example.invalid:5432/haydev",
    APP_ORIGINS: "https://app.example.invalid",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_123456789012345678901234",
    HAYDEV_DOCUMENT_BUCKET: "haydev-documents",
    MALWARE_SCANNER_PROVIDER: "metadefender",
    HAYDEV_DOMAIN: "app.example.invalid",
    ...overrides,
  };
}

describe("Production environment fail-fast validation", () => {
  test("accepts the explicitly configured Storage compatibility JWT", () => {
    expect(runtimeEnvironmentIssues(productionEnvironment({
      SUPABASE_STORAGE_AUTH_JWT: `${"eyJ"}${"a".repeat(40)}.${"b".repeat(40)}.${"c".repeat(40)}`,
    }))).toEqual([]);
  });

  test("rejects a malformed Storage compatibility credential", () => {
    expect(runtimeEnvironmentIssues(productionEnvironment({
      SUPABASE_STORAGE_AUTH_JWT: "legacy-service-role-key",
    }))).toContain("SUPABASE_STORAGE_AUTH_JWT: must be a compact JWT");
  });

  test("requires HAYDEV_DOMAIN for the Caddy production site", () => {
    const source = productionEnvironment();
    delete source.HAYDEV_DOMAIN;
    expect(runtimeEnvironmentIssues(source)).toContain(
      "HAYDEV_DOMAIN: Invalid input: expected string, received undefined",
    );
  });

  test("rejects localhost as the public Caddy domain", () => {
    expect(runtimeEnvironmentIssues(productionEnvironment({
      HAYDEV_DOMAIN: "localhost",
    }))).toContain("HAYDEV_DOMAIN: HAYDEV_DOMAIN must be one canonical public DNS hostname");
  });

  test.each([":80", "0.0.0.0", "app.example.invalid:443", "https://app.example.invalid", "*.example.invalid"])(
    "rejects unsafe Caddy site address %s",
    (domain) => {
      expect(runtimeEnvironmentIssues(productionEnvironment({ HAYDEV_DOMAIN: domain }))).toContain(
        "HAYDEV_DOMAIN: HAYDEV_DOMAIN must be one canonical public DNS hostname",
      );
    },
  );

  test("the canonical VPS service keeps Node on loopback behind Caddy", () => {
    const service = readFileSync(resolve(import.meta.dir, "../deploy/systemd/haydevos.service"), "utf8");
    const caddy = readFileSync(resolve(import.meta.dir, "../Caddyfile"), "utf8");
    expect(service).toContain("Environment=HOSTNAME=127.0.0.1");
    expect(service).toContain("ExecStart=/usr/local/bin/node server.js");
    expect(caddy).toContain("request_body @documentUpload");
    expect(caddy).toContain("max_size 26MB");
    expect(caddy).toContain("max_size 512KB");
  });
});
