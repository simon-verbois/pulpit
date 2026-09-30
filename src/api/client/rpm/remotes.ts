import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmRemote, RpmRemoteCreate, RpmRemoteUpdate } from "./types";
import { listRpmUlnRemotes } from "./ulnRemotes";

const BASE = apiPath("/remotes/rpm/rpm/");

export interface ListRpmRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listRpmRemotes(
  params: ListRpmRemotesParams,
): Promise<PulpPage<RpmRemote>> {
  return pulpFetch<PulpPage<RpmRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every remote page - used to populate the small "remote" select in
 * the repository create form, which isn't expected to have hundreds of
 * remotes in this bootstrap's scope. */
export async function listAllRpmRemotes(): Promise<RpmRemote[]> {
  const page = await listRpmRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export interface RpmRemoteOption {
  pulp_href: string;
  name: string;
  kind: "standard" | "uln";
}

/** Every remote an RPM repository can use as its default remote - VERIFIED:
 * `RpmRepository.remote` accepts both `/remotes/rpm/rpm/` and
 * `/remotes/rpm/uln/` hrefs, so the repository create/edit select must list
 * both collections (listing only the standard one hid ULN remotes entirely).
 * Not for ACS, which only accepts standard remotes. */
export async function listAllRpmRemoteOptions(): Promise<RpmRemoteOption[]> {
  const [standard, uln] = await Promise.all([
    listRpmRemotes({ limit: 100, offset: 0 }),
    listRpmUlnRemotes({ limit: 100, offset: 0 }),
  ]);
  return [
    ...standard.results.map((r) => ({
      pulp_href: r.pulp_href,
      name: r.name,
      kind: "standard" as const,
    })),
    ...uln.results.map((r) => ({
      pulp_href: r.pulp_href,
      name: r.name,
      kind: "uln" as const,
    })),
  ];
}

export function createRpmRemote(data: RpmRemoteCreate): Promise<RpmRemote> {
  return pulpFetch<RpmRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteRpmRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: update is asynchronous (202 + task),
 * same as repository update - never assume PATCH mirrors POST's sync/async
 * behavior. */
export function updateRpmRemote(
  href: string,
  data: RpmRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
