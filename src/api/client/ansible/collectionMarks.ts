import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { CollectionVersionMark, PulpPage } from "./types";

const BASE = apiPath("/content/ansible/collection_marks/");

export interface ListCollectionMarksParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

/** Read-only here - marks are created via the repository's `mark`/`unmark`
 * actions (src/api/client/ansible/repositories.ts), not by posting directly
 * to this collection endpoint. */
export function listCollectionMarks(
  params: ListCollectionMarksParams,
): Promise<PulpPage<CollectionVersionMark>> {
  return pulpFetch<PulpPage<CollectionVersionMark>>(`${BASE}${buildQuery(params)}`);
}
