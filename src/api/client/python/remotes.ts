import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  PythonRemote,
  PythonRemoteCreate,
  PythonRemoteUpdate,
} from "./types";

const BASE = apiPath("/remotes/python/python/");

export interface ListPythonRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listPythonRemotes(
  params: ListPythonRemotesParams,
): Promise<PulpPage<PythonRemote>> {
  return pulpFetch<PulpPage<PythonRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every remote page - used to populate the small "remote" select in
 * the repository create form, which isn't expected to have hundreds of
 * remotes in this bootstrap's scope. */
export async function listAllPythonRemotes(): Promise<PythonRemote[]> {
  const page = await listPythonRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export function createPythonRemote(data: PythonRemoteCreate): Promise<PythonRemote> {
  return pulpFetch<PythonRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deletePythonRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updatePythonRemote(
  href: string,
  data: PythonRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
