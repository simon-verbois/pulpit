import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  ContainerRepository,
  ContainerRepositoryCreate,
  ContainerRepositoryUpdate,
  PulpPage,
  RepositoryVersion,
} from "./types";

const BASE = apiPath("/repositories/container/container/");

export interface ListContainerRepositoriesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listContainerRepositories(
  params: ListContainerRepositoriesParams,
): Promise<PulpPage<ContainerRepository>> {
  return pulpFetch<PulpPage<ContainerRepository>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every repository page - used to populate small "repository"
 * selects (e.g. the distribution create form, the copy-content modal). */
export async function listAllContainerRepositories(): Promise<ContainerRepository[]> {
  const page = await listContainerRepositories({ limit: 100, offset: 0 });
  return page.results;
}

/**
 * Repository hrefs are opaque and only known once you already have the
 * object (docs/PULP_API.md "Repository href semantics") - Pulpit's routes
 * use the repository's (unique) name as the URL slug instead, same as
 * RPM/Ansible.
 */
export async function getContainerRepositoryByName(
  name: string,
): Promise<ContainerRepository | null> {
  const page = await pulpFetch<PulpPage<ContainerRepository>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  return page.results[0] ?? null;
}

export function createContainerRepository(
  data: ContainerRepositoryCreate,
): Promise<ContainerRepository> {
  return pulpFetch<ContainerRepository>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteContainerRepository(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live schema: like RPM/Ansible, update is
 * asynchronous (202 + task) even though create is synchronous (201). */
export function updateContainerRepository(
  href: string,
  data: ContainerRepositoryUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function syncContainerRepository(
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

/** Tags an existing manifest (by digest) with a tag name - VERIFIED live:
 * asynchronous (202 + task). */
export function tagContainerImage(
  href: string,
  data: { tag: string; digest: string },
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}tag/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Removes a tag (the underlying manifest/blobs are untouched) - VERIFIED
 * live: asynchronous (202 + task). */
export function untagContainerImage(
  href: string,
  tag: string,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${href}untag/`, {
    method: "POST",
    body: JSON.stringify({ tag }),
  });
}

/** Copies every tag from a source repository version into this repository -
 * VERIFIED live schema: `names` (a subset of tag names) is supported but
 * omitted here, matching RPM/Ansible's "whole version" copy simplification.
 * Copying manifests is a *separate* action (copyContainerManifests) since
 * pulp_container models tags/manifests as distinct content types, unlike
 * RPM/Ansible's single combined copy endpoint. */
export function copyContainerTags(
  destinationHref: string,
  sourceRepositoryVersionHref: string,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${destinationHref}copy_tags/`, {
    method: "POST",
    body: JSON.stringify({ source_repository_version: sourceRepositoryVersionHref }),
  });
}

export function copyContainerManifests(
  destinationHref: string,
  sourceRepositoryVersionHref: string,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(`${destinationHref}copy_manifests/`, {
    method: "POST",
    body: JSON.stringify({ source_repository_version: sourceRepositoryVersionHref }),
  });
}
