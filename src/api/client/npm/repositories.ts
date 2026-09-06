import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RepositoryVersion,
  NpmRepository,
  NpmRepositoryCreate,
  NpmRepositoryUpdate,
} from "./types";

const BASE = apiPath("/repositories/npm/npm/");

export interface ListNpmRepositoriesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listNpmRepositories(
  params: ListNpmRepositoriesParams,
): Promise<PulpPage<NpmRepository>> {
  return pulpFetch<PulpPage<NpmRepository>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every repository page - used to populate small "repository"
 * selects (e.g. the distribution create form). */
export async function listAllNpmRepositories(): Promise<NpmRepository[]> {
  const page = await listNpmRepositories({ limit: 100, offset: 0 });
  return page.results;
}

/**
 * Repository hrefs are opaque and only known once you already have the
 * object (docs/PULP_API.md "Repository href semantics") - Pulpit's routes
 * use the repository's (unique) name as the URL slug instead, so this looks
 * the href up via an exact-match filter on the collection endpoint.
 */
export async function getNpmRepositoryByName(name: string): Promise<NpmRepository | null> {
  const page = await pulpFetch<PulpPage<NpmRepository>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  // `null`, not `undefined` - TanStack Query treats a queryFn resolving to
  // `undefined` as an error ("Query data cannot be undefined"), which would
  // turn a legitimate "no such repository" result into a generic error
  // state instead of the intended not-found UI (see RepositoryDetailPage).
  return page.results[0] ?? null;
}

export function getNpmRepository(href: string): Promise<NpmRepository> {
  return pulpFetch<NpmRepository>(href);
}

export function createNpmRepository(data: NpmRepositoryCreate): Promise<NpmRepository> {
  return pulpFetch<NpmRepository>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteNpmRepository(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: unlike create (201, sync), a partial
 * update is asynchronous (202 + task) even for plain field changes like
 * `description` - never assume PATCH follows POST's sync/async behavior. */
export function updateNpmRepository(
  href: string,
  data: NpmRepositoryUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function syncNpmRepository(
  href: string,
  options: { remote?: string; mirror?: boolean } = {},
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}sync/`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export interface ListRepositoryVersionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
}

export function listRepositoryVersions(
  versionsHref: string,
  params: ListRepositoryVersionsParams,
): Promise<PulpPage<RepositoryVersion>> {
  return pulpFetch<PulpPage<RepositoryVersion>>(`${versionsHref}${buildQuery(params)}`);
}

export function deleteRepositoryVersion(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
