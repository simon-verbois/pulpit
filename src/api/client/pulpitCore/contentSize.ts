import { coreFetch, corePath } from "./httpClient";
import type {
  ComponentContentSize,
  ComponentRepositoryCount,
  RepositoryContentSize,
} from "./types";

const BASE = corePath("/content_size");

export const contentSizeKeys = {
  all: ["pulp", "content-sizes"] as const,
  components: ["pulp", "content-sizes", "components"] as const,
  repositories: ["pulp", "content-sizes", "repositories"] as const,
  repositoryCounts: ["pulp", "content-sizes", "repository-counts"] as const,
};

export function getComponentContentSizes(): Promise<ComponentContentSize[]> {
  return coreFetch<ComponentContentSize[]>(`${BASE}/sizes`);
}

export function getRepositoryContentSizes(): Promise<RepositoryContentSize[]> {
  return coreFetch<RepositoryContentSize[]>(`${BASE}/repository-sizes`);
}

export function getComponentRepositoryCounts(): Promise<ComponentRepositoryCount[]> {
  return coreFetch<ComponentRepositoryCount[]>(`${BASE}/repository-counts`);
}
