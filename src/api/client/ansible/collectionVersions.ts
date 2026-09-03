import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { CollectionVersion, PulpPage } from "./types";

const BASE = apiPath("/content/ansible/collection_versions/");

export interface ListCollectionVersionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  namespace?: string;
  repository_version?: string;
}

export function listCollectionVersions(
  params: ListCollectionVersionsParams,
): Promise<PulpPage<CollectionVersion>> {
  return pulpFetch<PulpPage<CollectionVersion>>(`${BASE}${buildQuery(params)}`);
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
