import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { CollectionVersion, PulpPage } from "./types";

const BASE = apiPath("/content/ansible/collection_versions/");

export interface ListCollectionVersionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  namespace?: string;
  repository_version?: string;
}

export function listCollectionVersions(
  params: ListCollectionVersionsParams,
): Promise<PulpPage<CollectionVersion>> {
  return pulpFetch<PulpPage<CollectionVersion>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED live: this endpoint has no `name__contains`/`name__icontains` -
 * only an exact-match `name` filter - so a partial-text search box can't
 * be implemented as a server-side query param the way every other list
 * page in this app does. Fetches every collection version in one large
 * page instead, for client-side search
 * (src/hooks/useClientSideSearch.ts) - bounded, not a true
 * unbounded-catalog fetch, which is a realistic assumption at the
 * self-hosted scale this app targets (CLAUDE.md "Stay 100% local"). */
export async function listAllCollectionVersions(): Promise<CollectionVersion[]> {
  const page = await listCollectionVersions({ limit: 10000, offset: 0 });
  return page.results;
}

/**
 * Uploads a collection tarball directly to a repository (one step - VERIFIED
 * live schema: `ansible.CollectionVersion`'s `file`+`repository` fields, the
 * non-deprecated upload path). Unlike RPM package upload, this is
 * asynchronous (202 + task): pulp_ansible parses and imports the collection
 * metadata as part of the task, not synchronously.
 *
 * There's also an older, dedicated one-shot upload endpoint
 * (`/ansible/collections/`, plus a Galaxy-v3-compatible equivalent) that
 * returns a separate `CollectionImport` resource for polling richer
 * import messages - VERIFIED live schema: both are marked `deprecated: true`.
 * This app uses the modern endpoint instead and tracks the returned task
 * like any other async operation (see useUploadCollectionVersionMutation) -
 * no separate import-progress UI needed.
 */
export function uploadCollectionVersion(
  file: File,
  repositoryHref: string,
): Promise<{ task: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("repository", repositoryHref);
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: formData,
  });
}
