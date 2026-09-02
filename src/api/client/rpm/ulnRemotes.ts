import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmUlnRemote, RpmUlnRemoteCreate } from "./types";

const BASE = apiPath("/remotes/rpm/uln/");

export interface ListRpmUlnRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listRpmUlnRemotes(
  params: ListRpmUlnRemotesParams,
): Promise<PulpPage<RpmUlnRemote>> {
  return pulpFetch<PulpPage<RpmUlnRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Synchronous create (VERIFIED: 201, no task), same as a standard remote. */
export function createRpmUlnRemote(data: RpmUlnRemoteCreate): Promise<RpmUlnRemote> {
  return pulpFetch<RpmUlnRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteRpmUlnRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
