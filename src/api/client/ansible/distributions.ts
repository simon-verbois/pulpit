import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { AnsibleDistribution, AnsibleDistributionCreate, PulpPage } from "./types";

const BASE = apiPath("/distributions/ansible/ansible/");

export interface ListAnsibleDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listAnsibleDistributions(
  params: ListAnsibleDistributionsParams,
): Promise<PulpPage<AnsibleDistribution>> {
  return pulpFetch<PulpPage<AnsibleDistribution>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every distribution page - used to populate the Namespaces page's
 * "which distribution" picker (Galaxy namespace management is scoped per
 * distribution, see galaxyNamespaces.ts). */
export async function listAllAnsibleDistributions(): Promise<AnsibleDistribution[]> {
  const page = await listAnsibleDistributions({ limit: 100, offset: 0 });
  return page.results;
}

export function createAnsibleDistribution(
  data: AnsibleDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteAnsibleDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
