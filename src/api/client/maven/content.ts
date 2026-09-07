import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, MavenContent } from "./types";

const BASE = apiPath("/content/maven/artifact/");

export interface ListMavenContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listMavenContent(
  params: ListMavenContentParams,
): Promise<PulpPage<MavenContent>> {
  return pulpFetch<PulpPage<MavenContent>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED live: this endpoint has no `group_id__contains`/
 * `group_id__icontains` at all - only an exact-match `group_id` filter -
 * so a partial-text search box can't be implemented as a server-side
 * query param the way every other list page in this app does. Fetches
 * every artifact in one large page instead, for client-side search
 * (src/hooks/useClientSideSearch.ts) - bounded, not a true
 * unbounded-catalog fetch, which is a realistic assumption at the
 * self-hosted scale this app targets (CLAUDE.md "Stay 100% local"). */
export async function listAllMavenContent(): Promise<MavenContent[]> {
  const page = await listMavenContent({ limit: 10000, offset: 0 });
  return page.results;
}

/**
 * VERIFIED live: unlike every other plugin's content upload in this app,
 * this endpoint is asynchronous (202 + task) and accepts an optional
 * `repository` field directly - so this is a genuine one-shot
 * upload-and-attach, not the usual two-step upload-then-modify. There's no
 * content href to `modify()` with anyway, since the response here is just a
 * task, not the created content object.
 */
export function uploadMavenContent(
  file: File,
  relativePath: string,
  repositoryHref: string,
): Promise<{ task: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("relative_path", relativePath);
  formData.append("repository", repositoryHref);
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: formData,
  });
}
