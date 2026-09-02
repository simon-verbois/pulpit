#!/usr/bin/env node
// Generates TypeScript types from the schema fetched by fetch-schema.mjs.
// See ADR 0004: this only generates types, never a request-making SDK, and
// its output must never be hand-edited.
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCHEMA_FILE = join(ROOT, "src/api/schemas/pulp-openapi.json");
// Per-plugin schema filtering is not yet verified against a live instance
// (docs/PULP_API.md), so the combined schema is generated into core/ for now.
const OUT_FILE = join(ROOT, "src/api/generated/core/schema.d.ts");

if (!existsSync(SCHEMA_FILE)) {
  console.error(`No schema found at ${SCHEMA_FILE}.\nRun "npm run api:fetch" first.`);
  process.exit(1);
}

await mkdir(join(ROOT, "src/api/generated/core"), { recursive: true });

const result = spawnSync(
  "npx",
  ["--no-install", "openapi-typescript", SCHEMA_FILE, "-o", OUT_FILE],
  { stdio: "inherit", cwd: ROOT },
);

process.exit(result.status ?? 1);
