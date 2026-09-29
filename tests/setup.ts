import { mock } from "bun:test";

// `server-only` is a compile-time boundary marker in Next.js. Bun's generic
// runtime otherwise executes the package's intentionally-throwing fallback
// before legitimate server integration tests can run.
mock.module("server-only", () => ({}));
