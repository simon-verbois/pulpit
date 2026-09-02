import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { ContainerManifest, PulpPage } from "./types";

const BASE = apiPath("/content/container/manifests/");

export interface ListContainerManifestsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listContainerManifests(
  params: ListContainerManifestsParams,
): Promise<PulpPage<ContainerManifest>> {
  return pulpFetch<PulpPage<ContainerManifest>>(`${BASE}${buildQuery(params)}`);
}
