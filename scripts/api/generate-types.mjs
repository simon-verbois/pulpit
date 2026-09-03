#!/usr/bin/env node
// Generates TypeScript types from the per-component schemas fetched by
// fetch-schema.mjs. See ADR 0004: this only generates types, never a
// request-making SDK, and its output must never be hand-edited.
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCHEMA_DIR = join(ROOT, "src/api/schemas");
const COMPONENTS = ["core", "rpm", "container", "ansible", "certguard"];

for (const component of COMPONENTS) {
  const schemaFile = join(SCHEMA_DIR, `${component}.json`);
  if (!existsSync(schemaFile)) {
    console.error(`No schema found at ${schemaFile}.\nRun "npm run api:fetch" first.`);
    process.exit(1);
  }

  const outDir = join(ROOT, `src/api/generated/${component}`);
  const outFile = join(outDir, "schema.d.ts");
  await mkdir(outDir, { recursive: true });

  const result = spawnSync(
    "npx",
    ["--no-install", "openapi-typescript", schemaFile, "-o", outFile],
    { stdio: "inherit", cwd: ROOT },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
