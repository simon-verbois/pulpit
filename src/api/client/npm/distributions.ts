import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, NpmDistribution, NpmDistributionCreate } from "./types";

const BASE = apiPath("/distributions/npm/npm/");

export interface ListNpmDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listNpmDistributions(
  params: ListNpmDistributionsParams,
): Promise<PulpPage<NpmDistribution>> {
  return pulpFetch<PulpPage<NpmDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function createNpmDistribution(
  data: NpmDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteNpmDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
