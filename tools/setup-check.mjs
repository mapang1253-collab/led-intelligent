#!/usr/bin/env node
// Verifies the local toolchain matches docs/technology-stack.md before `pnpm dev`/`pnpm deploy` run.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const errors = [];

const [major] = process.versions.node.split(".").map(Number);
if (major < 24) {
  errors.push(`Node.js 24 LTS is required (found ${process.versions.node}).`);
}

try {
  execSync("pnpm --version", { stdio: "ignore" });
} catch {
  errors.push("pnpm is not on PATH. Run: corepack enable && corepack prepare pnpm@10 --activate");
}

for (const file of ["apps/web/.dev.vars", "apps/web/wrangler.jsonc"]) {
  if (!existsSync(file)) {
    errors.push(`Missing ${file} — copy its .example and fill in real values (never commit it).`);
  }
}

if (errors.length > 0) {
  console.error(`setup:check failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}

console.log("setup:check passed.");
