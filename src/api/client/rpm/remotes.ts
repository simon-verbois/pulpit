import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmRemote, RpmRemoteCreate, RpmRemoteUpdate } from "./types";

const BASE = apiPath("/remotes/rpm/rpm/");

export interface ListRpmRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listRpmRemotes(
  params: ListRpmRemotesParams,
): Promise<PulpPage<RpmRemote>> {
  return pulpFetch<PulpPage<RpmRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every remote page - used to populate the small "remote" select in
 * the repository create form, which isn't expected to have hundreds of
 * remotes in this bootstrap's scope. */
export async function listAllRpmRemotes(): Promise<RpmRemote[]> {
  const page = await listRpmRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export function createRpmRemote(data: RpmRemoteCreate): Promise<RpmRemote> {
  return pulpFetch<RpmRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteRpmRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updateRpmRemote(
  href: string,
  data: RpmRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
