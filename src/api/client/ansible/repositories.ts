import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  AnsibleRepository,
  AnsibleRepositoryCreate,
  AnsibleRepositoryUpdate,
  PulpPage,
  RepositoryVersion,
} from "./types";

const BASE = apiPath("/repositories/ansible/ansible/");

export interface ListAnsibleRepositoriesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listAnsibleRepositories(
  params: ListAnsibleRepositoriesParams,
): Promise<PulpPage<AnsibleRepository>> {
  return pulpFetch<PulpPage<AnsibleRepository>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every repository page - used to populate small "repository"
 * selects (e.g. the distribution create form), mirroring
 * src/api/client/rpm/repositories.ts's listAllRpmRepositories. */
export async function listAllAnsibleRepositories(): Promise<AnsibleRepository[]> {
  const page = await listAnsibleRepositories({ limit: 100, offset: 0 });
  return page.results;
}

/**
 * Repository hrefs are opaque and only known once you already have the
 * object (docs/PULP_API.md "Repository href semantics") - Pulpit's routes
 * use the repository's (unique) name as the URL slug instead, same as RPM.
 */
export async function getAnsibleRepositoryByName(
  name: string,
): Promise<AnsibleRepository | null> {
  const page = await pulpFetch<PulpPage<AnsibleRepository>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  // `null`, not `undefined` - see docs/PULP_API.md's note on this same
  // TanStack Query gotcha (RPM repository lookup-by-name).
  return page.results[0] ?? null;
}

export function createAnsibleRepository(
  data: AnsibleRepositoryCreate,
): Promise<AnsibleRepository> {
  return pulpFetch<AnsibleRepository>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteAnsibleRepository(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

export function updateAnsibleRepository(
  href: string,
  data: AnsibleRepositoryUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** VERIFIED live schema (AnsibleRepositorySyncURL): richer than RPM's sync
 * body - `mirror` (remove content missing from the remote, additive-only
 * when false) and `optimize` are both real options, not just `remote`. */
export function syncAnsibleRepository(
  href: string,
  options: { remote?: string; mirror?: boolean } = {},
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}sync/`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export function modifyAnsibleRepository(
  href: string,
  body: { add_content_units?: string[]; remove_content_units?: string[] },
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}modify/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Signs content units (or `["*"]` for everything currently in the
 * repository) with a configured signing service. */
export function signAnsibleRepositoryContent(
  href: string,
  body: { content_units: string[]; signing_service: string },
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}sign/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function markAnsibleRepositoryContent(
  href: string,
  body: { content_units: string[]; value: string },
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}mark/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function unmarkAnsibleRepositoryContent(
  href: string,
  body: { content_units: string[]; value: string },
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}unmark/`, {
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

export function listRepositoryVersions(
  versionsHref: string,
  params: ListRepositoryVersionsParams,
): Promise<PulpPage<RepositoryVersion>> {
  return pulpFetch<PulpPage<RepositoryVersion>>(`${versionsHref}${buildQuery(params)}`);
}
