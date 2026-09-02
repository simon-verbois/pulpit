import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { GitRemote, GitRemoteCreate, GitRemoteUpdate, PulpPage } from "./types";

const BASE = apiPath("/remotes/ansible/git/");

export interface ListGitRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listGitRemotes(
  params: ListGitRemotesParams,
): Promise<PulpPage<GitRemote>> {
  return pulpFetch<PulpPage<GitRemote>>(`${BASE}${buildQuery(params)}`);
}

export function createGitRemote(data: GitRemoteCreate): Promise<GitRemote> {
  return pulpFetch<GitRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateGitRemote(
  href: string,
  data: GitRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteGitRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
