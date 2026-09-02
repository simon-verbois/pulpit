import { coreFetch, corePath } from "./httpClient";
import type { ComponentContentSize, RepositoryContentSize } from "./types";

const BASE = corePath("/content_size");

export function getComponentContentSizes(): Promise<ComponentContentSize[]> {
  return coreFetch<ComponentContentSize[]>(`${BASE}/sizes`);
}

export function getRepositoryContentSizes(): Promise<RepositoryContentSize[]> {
  return coreFetch<RepositoryContentSize[]>(`${BASE}/repository-sizes`);
}
