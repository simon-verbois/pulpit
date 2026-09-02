import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmDistributionTree } from "./types";

const BASE = apiPath("/content/rpm/distribution_trees/");

export interface ContentListParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listRpmDistributionTrees(
  params: ContentListParams,
): Promise<PulpPage<RpmDistributionTree>> {
  return pulpFetch<PulpPage<RpmDistributionTree>>(`${BASE}${buildQuery(params)}`);
}
