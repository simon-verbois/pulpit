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

/** VERIFIED live: this endpoint has no `name__contains`/`name__icontains` -
 * only an exact-match `name` filter - so a partial-text search box can't
 * be implemented as a server-side query param the way every other list
 * page in this app does. Fetches every tag in one large page instead, for
 * client-side search (src/hooks/useClientSideSearch.ts) - bounded, not a
 * true unbounded-catalog fetch, which is a realistic assumption at the
 * self-hosted scale this app targets (CLAUDE.md "Stay 100% local"). */
export async function listAllContainerTags(): Promise<ContainerTag[]> {
  const page = await listContainerTags({ limit: 10000, offset: 0 });
  return page.results;
}
