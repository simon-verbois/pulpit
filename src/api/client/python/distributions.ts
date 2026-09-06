import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, PythonDistribution, PythonDistributionCreate } from "./types";

// VERIFIED live: this plugin's distribution collection lives under
// `.../pypi/`, not `.../python/` (matching publications.ts's own quirk).
const BASE = apiPath("/distributions/python/pypi/");

export interface ListPythonDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listPythonDistributions(
  params: ListPythonDistributionsParams,
): Promise<PulpPage<PythonDistribution>> {
  return pulpFetch<PulpPage<PythonDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function createPythonDistribution(
  data: PythonDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deletePythonDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
