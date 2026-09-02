import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RpmPackageCategory,
  RpmPackageEnvironment,
  RpmPackageGroup,
  RpmPackageLangpacks,
} from "./types";

const GROUPS_BASE = apiPath("/content/rpm/packagegroups/");
const CATEGORIES_BASE = apiPath("/content/rpm/packagecategories/");
const ENVIRONMENTS_BASE = apiPath("/content/rpm/packageenvironments/");
const LANGPACKS_BASE = apiPath("/content/rpm/packagelangpacks/");
// Not under /content/rpm/ like the other endpoints in this file - VERIFIED
// against the live schema: /pulp/api/v3/rpm/comps/.
const COMPS_UPLOAD = apiPath("/rpm/comps/");

export interface ContentListParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listRpmPackageGroups(
  params: ContentListParams,
): Promise<PulpPage<RpmPackageGroup>> {
  return pulpFetch<PulpPage<RpmPackageGroup>>(`${GROUPS_BASE}${buildQuery(params)}`);
}

export function listRpmPackageCategories(
  params: ContentListParams,
): Promise<PulpPage<RpmPackageCategory>> {
  return pulpFetch<PulpPage<RpmPackageCategory>>(
    `${CATEGORIES_BASE}${buildQuery(params)}`,
  );
}

export function listRpmPackageEnvironments(
  params: ContentListParams,
): Promise<PulpPage<RpmPackageEnvironment>> {
  return pulpFetch<PulpPage<RpmPackageEnvironment>>(
    `${ENVIRONMENTS_BASE}${buildQuery(params)}`,
  );
}

export function listRpmPackageLangpacks(
  params: ContentListParams,
): Promise<PulpPage<RpmPackageLangpacks>> {
  return pulpFetch<PulpPage<RpmPackageLangpacks>>(
    `${LANGPACKS_BASE}${buildQuery(params)}`,
  );
}

/** Bulk-creates package groups/categories/environments/langpacks from one
 * comps.xml file, added to `repositoryHref` (async, 202 + task). */
export function uploadComps(
  file: File,
  repositoryHref: string,
): Promise<{ task: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("repository", repositoryHref);
  return pulpFetch<{ task: string }>(COMPS_UPLOAD, {
    method: "POST",
    body: formData,
  });
}
