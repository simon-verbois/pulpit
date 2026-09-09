#!/usr/bin/env node
// Extracts every literal Pulp API path this app's hand-written adapters
// depend on (src/api/client/**/*.ts, excluding pulpitCore/ - that's
// pulpit-core's OWN API via corePath(), never Pulp's) into a manifest
// pulpit-core reads at container startup to check those paths still exist
// on the live Pulp instance's own OpenAPI schema (app/modules/
// api_compatibility/). Only collection-level base paths are captured (the
// `const BASE = apiPath("/repositories/rpm/rpm/")` pattern every adapter
// file uses, VERIFIED: all 91 current apiPath() call sites use a plain
// string literal, never a template literal) - per-resource sub-actions
// built from a BASE at runtime (`${BASE}${id}/publish/`, `:id/`, ...) are
// not individually captured, so this catches "this whole resource type
// disappeared", not "one specific sub-action did".
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC_DIR = join(ROOT, "src/api/client");
const OUT_FILE = join(
  ROOT,
  "pulpit-core/app/modules/api_compatibility/used_endpoints.json",
);

const API_PATH_CALL = /\bapiPath\(\s*"([^"]+)"\s*\)/g;

async function collectTsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

const files = await collectTsFiles(SRC_DIR);
const paths = new Set();

for (const file of files) {
  const contents = await readFile(file, "utf8");
  for (const match of contents.matchAll(API_PATH_CALL)) {
    paths.add(match[1]);
  }
}

const sorted = [...paths].sort();
await writeFile(OUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`);

console.log(
  `Wrote ${sorted.length} used Pulp API paths (from ${files.length} files) to ` +
    relative(ROOT, OUT_FILE),
);
