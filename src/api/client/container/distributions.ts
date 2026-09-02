import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  ContainerDistribution,
  ContainerDistributionCreate,
  PulpPage,
} from "./types";

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
  return pulpFetch<PulpPage<ContainerDistribution>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED live schema: unlike RPM (sync, 201), create is asynchronous
 * (202 + task) here - same as Ansible distributions. */
export function createContainerDistribution(
  data: ContainerDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteContainerDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
