import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const standalone = resolve(root, ".next", "standalone");

if (!existsSync(standalone)) {
  throw new Error("Standalone output is missing. Run next build first.");
}

for (const entry of readdirSync(standalone)) {
  if (entry === ".env" || entry.startsWith(".env.")) {
    const environmentFile = resolve(standalone, entry);
    if (!environmentFile.startsWith(`${standalone}\\`) && !environmentFile.startsWith(`${standalone}/`)) {
      throw new Error("Refusing to remove an environment file outside the standalone output");
    }
    rmSync(environmentFile, { recursive: true, force: true });
  }
}

const copies = [
  [resolve(root, ".next", "static"), resolve(standalone, ".next", "static")],
  [resolve(root, "public"), resolve(standalone, "public")],
];

for (const [source, destination] of copies) {
  if (!existsSync(source)) continue;
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true, force: true });
}
