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

/** Fetches every remote page - used to populate the small "remote" select in
 * the repository create form, which isn't expected to have hundreds of
 * remotes in this bootstrap's scope. */
export async function listAllFileRemotes(): Promise<FileRemote[]> {
  const page = await listFileRemotes({ limit: 100, offset: 0 });
  return page.results;
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
