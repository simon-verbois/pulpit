import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RepositoryVersion,
  MavenRepository,
  MavenRepositoryCreate,
  MavenRepositoryUpdate,
} from "./types";

const BASE = apiPath("/repositories/maven/maven/");

export interface ListMavenRepositoriesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listMavenRepositories(
  params: ListMavenRepositoriesParams,
): Promise<PulpPage<MavenRepository>> {
  return pulpFetch<PulpPage<MavenRepository>>(`${BASE}${buildQuery(params)}`);
}

/**
 * Repository hrefs are opaque and only known once you already have the
 * object (docs/PULP_API.md "Repository href semantics") - Pulpit's routes
 * use the repository's (unique) name as the URL slug instead, so this looks
 * the href up via an exact-match filter on the collection endpoint.
 */
export async function getMavenRepositoryByName(
  name: string,
): Promise<MavenRepository | null> {
  const page = await pulpFetch<PulpPage<MavenRepository>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  // `null`, not `undefined` - TanStack Query treats a queryFn resolving to
  // `undefined` as an error ("Query data cannot be undefined"), which would
  // turn a legitimate "no such repository" result into a generic error
  // state instead of the intended not-found UI (see RepositoryDetailPage).
  return page.results[0] ?? null;
}

export function getMavenRepository(href: string): Promise<MavenRepository> {
  return pulpFetch<MavenRepository>(href);
}

export function createMavenRepository(
  data: MavenRepositoryCreate,
): Promise<MavenRepository> {
  return pulpFetch<MavenRepository>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteMavenRepository(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: unlike create (201, sync), a partial
 * update is asynchronous (202 + task) even for plain field changes like
 * `description` - never assume PATCH follows POST's sync/async behavior. */
export function updateMavenRepository(
  href: string,
  data: MavenRepositoryUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// No `sync` here - VERIFIED live: unlike every other plugin in this app,
// pulp_maven's Repository has no `remote` field and no `sync/` endpoint at
// all. Content only ever gets in via direct upload (see content.ts).

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
