import { pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { CrossRepoSearchResult, GalaxyPage } from "./types";

// VERIFIED live schema: the cross-repository search lives under the
// "default" Pulp domain's own Galaxy-v3-compatible API mount
// (/pulp_ansible/galaxy/...), a genuinely different base path from every
// other Ansible adapter in this app (which all live under the configurable
// /pulp/api/v3 base) - so this is a same-origin relative URL built directly,
// not through `apiPath` (ADR 0005: same-origin, relative-only requests).
const BASE =
  "/pulp_ansible/galaxy/default/api/v3/plugin/ansible/search/collection-versions/";

export interface SearchCollectionVersionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  q?: string;
  namespace?: string;
  name?: string;
  tags?: string;
  signed?: boolean;
}

/** Searches collection versions across every repository at once - VERIFIED
 * live schema query params (name/namespace/tags/q/signed/repository_name);
 * `repository_name` (array) isn't exposed in this simplified adapter since
 * Pulpit's search page is meant as a global "find this collection anywhere"
 * tool, not a repository-scoped filter (each repository already has its own
 * Collections tab for that). */
export function searchCollectionVersions(
  params: SearchCollectionVersionsParams,
): Promise<GalaxyPage<CrossRepoSearchResult>> {
  return pulpFetch<GalaxyPage<CrossRepoSearchResult>>(`${BASE}${buildQuery(params)}`);
}
