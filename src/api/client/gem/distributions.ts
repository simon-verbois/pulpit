import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, GemDistribution, GemDistributionCreate } from "./types";

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
  return pulpFetch<PulpPage<GemDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function createGemDistribution(
  data: GemDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteGemDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
