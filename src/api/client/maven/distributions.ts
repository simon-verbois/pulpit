import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, MavenDistribution, MavenDistributionCreate } from "./types";

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
  return pulpFetch<PulpPage<MavenDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function createMavenDistribution(
  data: MavenDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteMavenDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
