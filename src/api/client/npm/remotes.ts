import { collectPulpPages } from "../pagination";
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

/** Read all pages for repository and resource pickers. */
export async function listAllNpmRemotes(): Promise<NpmRemote[]> {
  return collectPulpPages((offset) => listNpmRemotes({ limit: 100, offset }));
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
