import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  FileGitRemote,
  FileGitRemoteCreate,
  FileGitRemoteUpdate,
} from "./types";

const BASE = apiPath("/remotes/file/git/");

export interface ListFileGitRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listFileGitRemotes(
  params: ListFileGitRemotesParams,
): Promise<PulpPage<FileGitRemote>> {
  return pulpFetch<PulpPage<FileGitRemote>>(`${BASE}${buildQuery(params)}`);
}

export function createFileGitRemote(
  data: FileGitRemoteCreate,
): Promise<FileGitRemote> {
  return pulpFetch<FileGitRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteFileGitRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live schema: unlike RPM's ULN remote, the git
 * flavor here supports PATCH just like a standard remote (async, 202 +
 * task). */
export function updateFileGitRemote(
  href: string,
  data: FileGitRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
