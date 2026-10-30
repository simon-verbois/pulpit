import { listRepositoryDistributions } from "../distributionManagement";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, MavenDistribution } from "./types";

const BASE = apiPath("/distributions/maven/maven/");

export interface ListMavenDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listMavenDistributions(
  params: ListMavenDistributionsParams,
): Promise<PulpPage<MavenDistribution>> {
  if (params.repository)
    return listRepositoryDistributions<MavenDistribution>(
      "maven",
      params.repository,
      params.limit,
      params.offset,
    );
  return pulpFetch<PulpPage<MavenDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function deleteMavenDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
