import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, SigningService } from "./types";

// A pulpcore-level (not Ansible-specific) resource - VERIFIED live
// (/pulp/api/v3/signing-services/, 200, empty list on this dev instance
// since none are configured). Read-only here: full signing-service
// management (creating one requires a server-side script + Django
// management command) is deferred to Milestone 6, see docs/ROADMAP.md. This
// adapter exists only to populate the "Sign" action's picker.
const BASE = apiPath("/signing-services/");

export async function listAllSigningServices(): Promise<SigningService[]> {
  const page = await pulpFetch<PulpPage<SigningService>>(
    `${BASE}${buildQuery({ limit: 100, offset: 0 })}`,
  );
  return page.results;
}
