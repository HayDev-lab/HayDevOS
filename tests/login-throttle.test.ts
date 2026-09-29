import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";

import {
  clearLoginAttempts,
  reserveLoginAttempts,
} from "../src/lib/auth/login-throttle";
import { getDb } from "../src/lib/db";

setDefaultTimeout(30_000);

const suffix = `${Date.now()}_${process.pid}`;
const email = `throttle-${suffix}@example.invalid`;
const address = `audit-${suffix}`;

afterAll(async () => {
  await clearLoginAttempts(email, address);
  await getDb().$disconnect();
});

describe("Login throttle concurrency", () => {
  test("only six parallel attempts reserve a password-check slot", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => reserveLoginAttempts(email, address)),
    );
    const accepted = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(accepted).toHaveLength(6);
    expect(rejected).toHaveLength(6);
    for (const result of rejected) {
      expect(result.reason).toMatchObject({ status: 429, code: "LOGIN_THROTTLED" });
    }
  });
});
