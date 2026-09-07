import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RepositoryVersion,
  DebRepository,
  DebRepositoryCreate,
  DebRepositoryUpdate,
} from "./types";

// VERIFIED live: every path segment for this plugin is "apt", not "deb".
const BASE = apiPath("/repositories/deb/apt/");

export interface ListDebRepositoriesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listDebRepositories(
  params: ListDebRepositoriesParams,
): Promise<PulpPage<DebRepository>> {
  return pulpFetch<PulpPage<DebRepository>>(`${BASE}${buildQuery(params)}`);
}

/**
 * Repository hrefs are opaque and only known once you already have the
 * object (docs/PULP_API.md "Repository href semantics") - Pulpit's routes
 * use the repository's (unique) name as the URL slug instead, so this looks
 * the href up via an exact-match filter on the collection endpoint.
 */
export async function getDebRepositoryByName(
  name: string,
): Promise<DebRepository | null> {
  const page = await pulpFetch<PulpPage<DebRepository>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  // `null`, not `undefined` - TanStack Query treats a queryFn resolving to
  // `undefined` as an error ("Query data cannot be undefined"), which would
  // turn a legitimate "no such repository" result into a generic error
  // state instead of the intended not-found UI (see RepositoryDetailPage).
  return page.results[0] ?? null;
}

export function createDebRepository(data: DebRepositoryCreate): Promise<DebRepository> {
  return pulpFetch<DebRepository>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteDebRepository(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: unlike create (201, sync), a partial
 * update is asynchronous (202 + task) even for plain field changes like
 * `description` - never assume PATCH follows POST's sync/async behavior. */
export function updateDebRepository(
  href: string,
  data: DebRepositoryUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function syncDebRepository(
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
