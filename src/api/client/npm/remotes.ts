import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, NpmRemote, NpmRemoteCreate, NpmRemoteUpdate } from "./types";

const BASE = apiPath("/remotes/npm/npm/");

export interface ListNpmRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listNpmRemotes(
  params: ListNpmRemotesParams,
): Promise<PulpPage<NpmRemote>> {
  return pulpFetch<PulpPage<NpmRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every remote page - used to populate the small "remote" select in
 * the repository create form and the distribution's pull-through cache
 * select, neither of which is expected to have hundreds of remotes in this
 * bootstrap's scope. */
export async function listAllNpmRemotes(): Promise<NpmRemote[]> {
  const page = await listNpmRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export function createNpmRemote(data: NpmRemoteCreate): Promise<NpmRemote> {
  return pulpFetch<NpmRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteNpmRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updateNpmRemote(
  href: string,
  data: NpmRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
