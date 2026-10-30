import { collectPulpPages } from "../pagination";
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

/** Read all catalog pages for client-side substring search. */
export async function listAllSigningServices(): Promise<SigningService[]> {
  return collectPulpPages((offset) => listSigningServices({ limit: 10000, offset }));
}
