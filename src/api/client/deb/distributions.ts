import { listRepositoryDistributions } from "../distributionManagement";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, DebDistribution } from "./types";

const BASE = apiPath("/distributions/deb/apt/");

export interface ListDebDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listDebDistributions(
  params: ListDebDistributionsParams,
): Promise<PulpPage<DebDistribution>> {
  if (params.repository)
    return listRepositoryDistributions<DebDistribution>(
      "deb",
      params.repository,
      params.limit,
      params.offset,
    );
  return pulpFetch<PulpPage<DebDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function deleteDebDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
