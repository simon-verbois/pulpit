import { listRepositoryDistributions } from "../distributionManagement";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, GemDistribution } from "./types";

const BASE = apiPath("/distributions/gem/gem/");

export interface ListGemDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listGemDistributions(
  params: ListGemDistributionsParams,
): Promise<PulpPage<GemDistribution>> {
  if (params.repository)
    return listRepositoryDistributions<GemDistribution>(
      "gem",
      params.repository,
      params.limit,
      params.offset,
    );
  return pulpFetch<PulpPage<GemDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function deleteGemDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
