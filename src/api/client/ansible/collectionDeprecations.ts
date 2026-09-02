import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { CollectionDeprecation, PulpPage } from "./types";

const BASE = apiPath("/content/ansible/collection_deprecations/");

export interface ListCollectionDeprecationsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  namespace?: string;
  name?: string;
}

export function listCollectionDeprecations(
  params: ListCollectionDeprecationsParams,
): Promise<PulpPage<CollectionDeprecation>> {
  return pulpFetch<PulpPage<CollectionDeprecation>>(`${BASE}${buildQuery(params)}`);
}

/** Marks a namespace+name collection (all its versions) as deprecated -
 * async (202 + task), VERIFIED live schema. Requires a `repository` to
 * associate the deprecation marker with. NOTE: VERIFIED live schema has no
 * DELETE on the individual deprecation resource - un-deprecating isn't
 * wired up in this first pass (a documented gap, not an oversight). */
export function deprecateCollection(data: {
  namespace: string;
  name: string;
  repository: string;
}): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
