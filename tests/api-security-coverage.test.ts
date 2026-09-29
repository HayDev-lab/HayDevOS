import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join, normalize, relative } from "node:path";
import ts from "typescript";

const ROOT = normalize(join(import.meta.dir, "..", "src", "app", "api"));
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

function relPath(abs: string): string {
  return relative(ROOT, abs).replaceAll("\\", "/");
}

type RouteClass = "TENANT_PROTECTED" | "PUBLIC_EXPLICIT" | "HEALTH";

const EXPLICIT_HANDLERS = new Map<string, Map<string, Exclude<RouteClass, "TENANT_PROTECTED">>>([
  ["route.ts", new Map([["GET", "PUBLIC_EXPLICIT"]])],
  ["auth/login/route.ts", new Map([["POST", "PUBLIC_EXPLICIT"]])],
  ["health/route.ts", new Map([["GET", "HEALTH"]])],
  ["ready/route.ts", new Map([["GET", "HEALTH"]])],
]);

function isExported(node: ts.Node): boolean {
  return Boolean(ts.getModifiers(node as ts.HasModifiers)?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  ));
}

function exportedHandlers(sourceFile: ts.SourceFile): Array<{ method: string; node: ts.Node }> {
  const handlers: Array<{ method: string; node: ts.Node }> = [];
  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
      if (HTTP_METHODS.has(statement.name.text)) handlers.push({ method: statement.name.text, node: statement });
      continue;
    }
    if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && HTTP_METHODS.has(declaration.name.text)) {
          handlers.push({ method: declaration.name.text, node: declaration });
        }
      }
    }
  }
  return handlers;
}

function callsNamed(node: ts.Node, name: string): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (child: ts.Node) => {
    if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === name) calls.push(child);
    child.forEachChild(visit);
  };
  node.forEachChild(visit);
  return calls;
}

function mutationEnabled(call: ts.CallExpression): boolean {
  const options = call.arguments[1];
  if (!options || !ts.isObjectLiteralExpression(options)) return false;
  return options.properties.some((property) =>
    ts.isPropertyAssignment(property) &&
    property.name.getText() === "mutation" &&
    property.initializer.kind === ts.SyntaxKind.TrueKeyword);
}

describe("API security coverage — every exported handler has an explicit security class", () => {
  test("all protected methods use the canonical wrapper and mutations enable origin checks", async () => {
    const routes = await walk(ROOT);
    expect(routes.length).toBeGreaterThan(0);
    const report: Array<{ route: string; method: string; cls: RouteClass }> = [];

    for (const abs of routes) {
      const rel = relPath(abs);
      const source = await readFile(abs, "utf8");
      const sourceFile = ts.createSourceFile(abs, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const handlers = exportedHandlers(sourceFile);
      expect(handlers.length, `${rel} must export at least one HTTP handler`).toBeGreaterThan(0);
      const explicit = EXPLICIT_HANDLERS.get(rel);

      for (const handler of handlers) {
        const explicitClass = explicit?.get(handler.method);
        if (explicitClass) {
          report.push({ route: rel, method: handler.method, cls: explicitClass });
          continue;
        }
        expect(explicit, `${rel} exports an undeclared public/health method ${handler.method}`).toBeUndefined();
        const wrapperCalls = callsNamed(handler.node, "withTenantApi");
        expect(wrapperCalls.length, `${rel} ${handler.method} must call withTenantApi inside that exported handler`).toBeGreaterThan(0);
        if (MUTATION_METHODS.has(handler.method)) {
          expect(wrapperCalls.some(mutationEnabled), `${rel} ${handler.method} must pass mutation: true to withTenantApi`).toBe(true);
        }
        report.push({ route: rel, method: handler.method, cls: "TENANT_PROTECTED" });
      }

      if (explicit) {
        expect(handlers.map((handler) => handler.method).sort(), `${rel} public/health method manifest drifted`).toEqual([...explicit.keys()].sort());
      }
      if (rel === "auth/login/route.ts") {
        expect(source).toContain("assertSameOrigin");
        expect(source).toContain("verifyPassword");
        expect(source).toContain("reserveLoginAttempts");
      }
    }

    expect(routes).toHaveLength(67);
    expect(report.length).toBeGreaterThanOrEqual(routes.length);
  });
});
