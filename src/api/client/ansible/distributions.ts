import { listRepositoryDistributions } from "../distributionManagement";
import { collectPulpPages } from "../pagination";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { AnsibleDistribution, PulpPage } from "./types";

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
  if (params.repository)
    return listRepositoryDistributions<AnsibleDistribution>(
      "ansible",
      params.repository,
      params.limit,
      params.offset,
    );
  return pulpFetch<PulpPage<AnsibleDistribution>>(`${BASE}${buildQuery(params)}`);
}

/** Read all pages for repository and resource pickers. */
export async function listAllAnsibleDistributions(): Promise<AnsibleDistribution[]> {
  return collectPulpPages((offset) => listAnsibleDistributions({ limit: 100, offset }));
}

export function deleteAnsibleDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
