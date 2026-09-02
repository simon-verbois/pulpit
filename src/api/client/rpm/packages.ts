import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmPackage } from "./types";

const BASE = apiPath("/content/rpm/packages/");
const UPLOAD = apiPath("/content/rpm/packages/upload/");

export interface ListRpmPackagesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository_version?: string;
}

export function listRpmPackages(
  params: ListRpmPackagesParams,
): Promise<PulpPage<RpmPackage>> {
  return pulpFetch<PulpPage<RpmPackage>>(`${BASE}${buildQuery(params)}`);
}

/**
 * One-shot package upload (VERIFIED against the live schema: the upload
 * endpoint only creates the content unit - it has no `repository` field to
 * add it to a repository in the same call, despite what its `overwrite`
 * field's description text suggests). Adding it to a repository is a
 * separate `modify` call - see src/api/client/rpm/repositories.ts and the
 * pulp-api skill.
 */
export function uploadRpmPackage(file: File): Promise<RpmPackage> {
  const formData = new FormData();
  formData.append("file", file);
  return pulpFetch<RpmPackage>(UPLOAD, {
    method: "POST",
    body: formData,
  });
}
