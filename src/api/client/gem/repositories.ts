import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RepositoryVersion,
  GemRepository,
  GemRepositoryCreate,
  GemRepositoryUpdate,
} from "./types";

const BASE = apiPath("/repositories/gem/gem/");

export interface ListGemRepositoriesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listGemRepositories(
  params: ListGemRepositoriesParams,
): Promise<PulpPage<GemRepository>> {
  return pulpFetch<PulpPage<GemRepository>>(`${BASE}${buildQuery(params)}`);
}

/**
 * Repository hrefs are opaque and only known once you already have the
 * object (docs/PULP_API.md "Repository href semantics") - Pulpit's routes
 * use the repository's (unique) name as the URL slug instead, so this looks
 * the href up via an exact-match filter on the collection endpoint.
 */
export async function getGemRepositoryByName(name: string): Promise<GemRepository | null> {
  const page = await pulpFetch<PulpPage<GemRepository>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  // `null`, not `undefined` - TanStack Query treats a queryFn resolving to
  // `undefined` as an error ("Query data cannot be undefined"), which would
  // turn a legitimate "no such repository" result into a generic error
  // state instead of the intended not-found UI (see RepositoryDetailPage).
  return page.results[0] ?? null;
}

export function createGemRepository(data: GemRepositoryCreate): Promise<GemRepository> {
  return pulpFetch<GemRepository>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteGemRepository(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: unlike create (201, sync), a partial
 * update is asynchronous (202 + task) even for plain field changes like
 * `description` - never assume PATCH follows POST's sync/async behavior. */
export function updateGemRepository(
  href: string,
  data: GemRepositoryUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function syncGemRepository(
  href: string,
  options: { remote?: string; mirror?: boolean } = {},
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}sync/`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export function modifyGemRepository(
  href: string,
  body: { add_content_units?: string[]; remove_content_units?: string[] },
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}modify/`, {
    method: "POST",
    body: JSON.stringify(body),
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
