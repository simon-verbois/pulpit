import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, FileDistribution, FileDistributionCreate } from "./types";

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
  return pulpFetch<PulpPage<FileDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function createFileDistribution(
  data: FileDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteFileDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
