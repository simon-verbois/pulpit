import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { CollectionVersionSignature, PulpPage } from "./types";

const BASE = apiPath("/content/ansible/collection_signatures/");

export interface ListCollectionSignaturesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

/** Read-only here - signatures are created via the repository's `sign`
 * action (src/api/client/ansible/repositories.ts's signAnsibleRepositoryContent),
 * not by posting directly to this collection endpoint. */
export function listCollectionSignatures(
  params: ListCollectionSignaturesParams,
): Promise<PulpPage<CollectionVersionSignature>> {
  return pulpFetch<PulpPage<CollectionVersionSignature>>(`${BASE}${buildQuery(params)}`);
}
