import { collectPulpPages } from "../pagination";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, FileRemote, FileRemoteCreate, FileRemoteUpdate } from "./types";

const BASE = apiPath("/remotes/file/file/");

export interface ListFileRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listFileRemotes(
  params: ListFileRemotesParams,
): Promise<PulpPage<FileRemote>> {
  return pulpFetch<PulpPage<FileRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Read all pages for repository and resource pickers. */
export async function listAllFileRemotes(): Promise<FileRemote[]> {
  return collectPulpPages((offset) => listFileRemotes({ limit: 100, offset }));
}

export function createFileRemote(data: FileRemoteCreate): Promise<FileRemote> {
  return pulpFetch<FileRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteFileRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updateFileRemote(
  href: string,
  data: FileRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
