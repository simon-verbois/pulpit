import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  MavenRemote,
  MavenRemoteCreate,
  MavenRemoteUpdate,
} from "./types";

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

/** Read all pages for repository and resource pickers. */

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
