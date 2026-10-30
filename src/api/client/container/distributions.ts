import { listRepositoryDistributions } from "../distributionManagement";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { ContainerDistribution, PulpPage } from "./types";

const BASE = apiPath("/distributions/container/container/");

export interface ListContainerDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listContainerDistributions(
  params: ListContainerDistributionsParams,
): Promise<PulpPage<ContainerDistribution>> {
  if (params.repository)
    return listRepositoryDistributions<ContainerDistribution>(
      "container",
      params.repository,
      params.limit,
      params.offset,
    );
  return pulpFetch<PulpPage<ContainerDistribution>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED live schema: unlike RPM (sync, 201), create is asynchronous
 * (202 + task) here - same as Ansible distributions. */

export function deleteContainerDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** Native pulp_container deletes a normal repository only with its last direct distribution. */
export async function containerDistributionDeletesRepository(
  distribution: ContainerDistribution,
): Promise<boolean> {
  if (!distribution.repository) return false;
  const page = await pulpFetch<PulpPage<{ pulp_href: string }>>(
    `${BASE}${buildQuery({ repository: distribution.repository, limit: 2, fields: "pulp_href" })}`,
  );
  return page.count <= 1;
}
