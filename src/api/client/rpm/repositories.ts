import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RepositoryVersion,
  RpmRepository,
  RpmRepositoryCreate,
  RpmRepositoryUpdate,
} from "./types";

const BASE = apiPath("/repositories/rpm/rpm/");

export interface ListRpmRepositoriesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listRpmRepositories(
  params: ListRpmRepositoriesParams,
): Promise<PulpPage<RpmRepository>> {
  return pulpFetch<PulpPage<RpmRepository>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every repository page - used to populate small "repository"
 * selects (e.g. the distribution create form) - see the equivalent
 * listAllRpmRemotes for the same rationale. */
export async function listAllRpmRepositories(): Promise<RpmRepository[]> {
  const page = await listRpmRepositories({ limit: 100, offset: 0 });
  return page.results;
}

/**
 * Repository hrefs are opaque and only known once you already have the
 * object (docs/PULP_API.md "Repository href semantics") - Pulpit's routes
 * use the repository's (unique) name as the URL slug instead, so this looks
 * the href up via an exact-match filter on the collection endpoint.
 */
export async function getRpmRepositoryByName(
  name: string,
): Promise<RpmRepository | null> {
  const page = await pulpFetch<PulpPage<RpmRepository>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  // `null`, not `undefined` - TanStack Query treats a queryFn resolving to
  // `undefined` as an error ("Query data cannot be undefined"), which would
  // turn a legitimate "no such repository" result into a generic error
  // state instead of the intended not-found UI (see RepositoryDetailPage).
  return page.results[0] ?? null;
}

export function getRpmRepository(href: string): Promise<RpmRepository> {
  return pulpFetch<RpmRepository>(href);
}

export function createRpmRepository(data: RpmRepositoryCreate): Promise<RpmRepository> {
  return pulpFetch<RpmRepository>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteRpmRepository(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live instance: unlike create (201, sync), a partial
 * update is asynchronous (202 + task) even for plain field changes like
 * `description` - never assume PATCH follows POST's sync/async behavior. */
export function updateRpmRepository(
  href: string,
  data: RpmRepositoryUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function syncRpmRepository(
  href: string,
  options: { remote?: string; mirror?: boolean } = {},
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}sync/`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export function modifyRpmRepository(
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
  ordering?: string;
}

/** Fetches every retained version for a version picker, newest first. */
export async function listAllRepositoryVersions(
  versionsHref: string,
): Promise<RepositoryVersion[]> {
  const limit = 100;
  let offset = 0;
  const versions: RepositoryVersion[] = [];

  while (true) {
    const page = await listRepositoryVersions(versionsHref, {
      limit,
      offset,
      ordering: "-number",
    });
    versions.push(...page.results);
    offset += page.results.length;
    if (offset >= page.count || page.results.length === 0) return versions;
  }
}

export function listRepositoryVersions(
  versionsHref: string,
  params: ListRepositoryVersionsParams,
): Promise<PulpPage<RepositoryVersion>> {
  return pulpFetch<PulpPage<RepositoryVersion>>(`${versionsHref}${buildQuery(params)}`);
}
