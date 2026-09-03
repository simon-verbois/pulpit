#!/usr/bin/env node
// Fetches Pulp's live OpenAPI schema from a running dev instance, scoped
// per component via `?component=<name>` - VERIFIED live (docs/PULP_API.md
// "OpenAPI schema discovery"): this actually filters the schema to one
// plugin, and matters beyond convenience - Pulp's own combined-schema docs
// page is unusably slow client-side at the combined size (906 endpoints /
// 6.7 MB, see that section), so this pipeline never fetches the combined
// schema for the same reason.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OUT_DIR = join(ROOT, "src/api/schemas");

// Matches src/api/generated/{name}/ and this project's plugins
// (docs/ARCHITECTURE.md) - "core" is pulpcore's own schema, un-suffixed.
// "certguard" (pulp_certguard: x509/RHSM content guards, used by
// src/api/client/administration/types.ts's CertContentGuard) is its own
// installable component distinct from "core", VERIFIED live: not included
// in the "core" component's own filtered schema.
const COMPONENTS = ["core", "rpm", "container", "ansible", "certguard"];

const base = process.env.PULP_API_BASE ?? "http://localhost:8080";

await mkdir(OUT_DIR, { recursive: true });

for (const component of COMPONENTS) {
  const schemaUrl = `${base}/pulp/api/v3/docs/api.json?component=${component}`;
  console.log(`Fetching Pulp OpenAPI schema (${component}) from ${schemaUrl} ...`);

  const response = await fetch(schemaUrl);
  if (!response.ok) {
    console.error(
      `Failed to fetch schema: ${response.status} ${response.statusText}\n` +
        "Is a Pulp instance running and reachable? See docs/DEVELOPMENT.md.",
    );
    process.exit(1);
  }

  const schema = await response.json();
  const outFile = join(OUT_DIR, `${component}.json`);
  await writeFile(outFile, JSON.stringify(schema, null, 2));
  console.log(`Wrote ${outFile}`);
}
