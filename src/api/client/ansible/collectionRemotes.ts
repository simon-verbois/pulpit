import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  CollectionRemote,
  CollectionRemoteCreate,
  CollectionRemoteUpdate,
  PulpPage,
} from "./types";

const BASE = apiPath("/remotes/ansible/collection/");

export interface ListCollectionRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listCollectionRemotes(
  params: ListCollectionRemotesParams,
): Promise<PulpPage<CollectionRemote>> {
  return pulpFetch<PulpPage<CollectionRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every page - used to populate the repository create/edit form's
 * "default remote" select (mirrors RPM's listAllRpmRemotes). */
export async function listAllCollectionRemotes(): Promise<CollectionRemote[]> {
  const page = await listCollectionRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export function createCollectionRemote(
  data: CollectionRemoteCreate,
): Promise<CollectionRemote> {
  return pulpFetch<CollectionRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateCollectionRemote(
  href: string,
  data: CollectionRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCollectionRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
