import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, MavenRemote, MavenRemoteCreate, MavenRemoteUpdate } from "./types";

const BASE = apiPath("/remotes/maven/maven/");

export interface ListMavenRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listMavenRemotes(
  params: ListMavenRemotesParams,
): Promise<PulpPage<MavenRemote>> {
  return pulpFetch<PulpPage<MavenRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every remote page - used to populate the "remote" select in the
 * distribution create form (pull-through caching), which isn't expected to
 * have hundreds of remotes in this bootstrap's scope. */
export async function listAllMavenRemotes(): Promise<MavenRemote[]> {
  const page = await listMavenRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export function createMavenRemote(data: MavenRemoteCreate): Promise<MavenRemote> {
  return pulpFetch<MavenRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteMavenRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updateMavenRemote(
  href: string,
  data: MavenRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
