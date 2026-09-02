#!/usr/bin/env node
// Fetches Pulp's live OpenAPI schema from a running dev instance.
// See ADR 0004 and docs/PULP_API.md - this requires a reachable Pulp
// (typically `docker compose up -d pulp`, or the full stack).
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT_DIR = join(ROOT, "src/api/schemas");
const OUT_FILE = join(OUT_DIR, "pulp-openapi.json");

const base = process.env.PULP_API_BASE ?? "http://localhost:8080";
const schemaUrl = `${base}/pulp/api/v3/docs/api.json`;

console.log(`Fetching Pulp OpenAPI schema from ${schemaUrl} ...`);

const response = await fetch(schemaUrl);
if (!response.ok) {
  console.error(
    `Failed to fetch schema: ${response.status} ${response.statusText}\n` +
      "Is a Pulp instance running and reachable? See docs/DEVELOPMENT.md.",
  );
  process.exit(1);
}

const schema = await response.json();
await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(schema, null, 2));

console.log(`Wrote ${OUT_FILE}`);
