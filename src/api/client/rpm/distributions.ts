import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmDistribution, RpmDistributionCreate } from "./types";

const BASE = apiPath("/distributions/rpm/rpm/");

export interface ListRpmDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listRpmDistributions(
  params: ListRpmDistributionsParams,
): Promise<PulpPage<RpmDistribution>> {
  return pulpFetch<PulpPage<RpmDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function createRpmDistribution(
  data: RpmDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteRpmDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
