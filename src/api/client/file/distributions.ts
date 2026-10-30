import { listRepositoryDistributions } from "../distributionManagement";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, FileDistribution } from "./types";

const BASE = apiPath("/distributions/file/file/");

export interface ListFileDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listFileDistributions(
  params: ListFileDistributionsParams,
): Promise<PulpPage<FileDistribution>> {
  if (params.repository)
    return listRepositoryDistributions<FileDistribution>(
      "file",
      params.repository,
      params.limit,
      params.offset,
    );
  return pulpFetch<PulpPage<FileDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function deleteFileDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
