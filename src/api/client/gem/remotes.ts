import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, GemRemote, GemRemoteCreate, GemRemoteUpdate } from "./types";

const BASE = apiPath("/remotes/gem/gem/");

export interface ListGemRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listGemRemotes(
  params: ListGemRemotesParams,
): Promise<PulpPage<GemRemote>> {
  return pulpFetch<PulpPage<GemRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every remote page - used to populate the small "remote" select in
 * the repository create form, which isn't expected to have hundreds of
 * remotes in this bootstrap's scope. */
export async function listAllGemRemotes(): Promise<GemRemote[]> {
  const page = await listGemRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export function createGemRemote(data: GemRemoteCreate): Promise<GemRemote> {
  return pulpFetch<GemRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteGemRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updateGemRemote(
  href: string,
  data: GemRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
