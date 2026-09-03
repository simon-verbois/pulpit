import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { ContainerTag, PulpPage } from "./types";

const BASE = apiPath("/content/container/tags/");

export interface ListContainerTagsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository_version?: string;
}

export function listContainerTags(
  params: ListContainerTagsParams,
): Promise<PulpPage<ContainerTag>> {
  return pulpFetch<PulpPage<ContainerTag>>(`${BASE}${buildQuery(params)}`);
}
