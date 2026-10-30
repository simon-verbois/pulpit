import { collectPulpPages } from "../pagination";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { ContainerTag, PulpPage } from "./types";

const BASE = apiPath("/content/container/tags/");

export interface ListContainerTagsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listContainerTags(
  params: ListContainerTagsParams,
): Promise<PulpPage<ContainerTag>> {
  return pulpFetch<PulpPage<ContainerTag>>(`${BASE}${buildQuery(params)}`);
}

/** Read all catalog pages for client-side substring search. */
export async function listAllContainerTags(): Promise<ContainerTag[]> {
  return collectPulpPages((offset) => listContainerTags({ limit: 10000, offset }));
}
