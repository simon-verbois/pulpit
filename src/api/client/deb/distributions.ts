import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, DebDistribution, DebDistributionCreate } from "./types";

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
  return pulpFetch<PulpPage<DebDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function createDebDistribution(
  data: DebDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteDebDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
