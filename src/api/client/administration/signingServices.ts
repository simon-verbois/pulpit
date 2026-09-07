import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, SigningService } from "./types";

const BASE = apiPath("/signing-services/");

export interface ListSigningServicesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
}

/** Read-only (VERIFIED live schema: GET only, no create/edit/delete at all -
 * see SigningService's doc comment in types.ts). */
export function listSigningServices(
  params: ListSigningServicesParams,
): Promise<PulpPage<SigningService>> {
  return pulpFetch<PulpPage<SigningService>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED live: this endpoint has no `name__contains`/`name__icontains`
 * at all - only an exact-match `name` filter - so a partial-text search
 * box can't be implemented as a server-side query param the way every
 * other list page in this app does. Fetches every signing service in one
 * large page instead, for client-side search
 * (src/hooks/useClientSideSearch.ts) - a real instance typically has a
 * handful of these, so this is a safe, bounded fetch. */
export async function listAllSigningServices(): Promise<SigningService[]> {
  const page = await listSigningServices({ limit: 10000, offset: 0 });
  return page.results;
}
