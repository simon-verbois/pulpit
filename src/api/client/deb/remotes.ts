import { collectPulpPages } from "../pagination";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, DebRemote, DebRemoteCreate, DebRemoteUpdate } from "./types";

const BASE = apiPath("/remotes/deb/apt/");

export interface ListDebRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listDebRemotes(
  params: ListDebRemotesParams,
): Promise<PulpPage<DebRemote>> {
  return pulpFetch<PulpPage<DebRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Read all pages for repository and resource pickers. */
export async function listAllDebRemotes(): Promise<DebRemote[]> {
  return collectPulpPages((offset) => listDebRemotes({ limit: 100, offset }));
}

export function createDebRemote(data: DebRemoteCreate): Promise<DebRemote> {
  return pulpFetch<DebRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteDebRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updateDebRemote(
  href: string,
  data: DebRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
