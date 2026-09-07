import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, NpmContent } from "./types";

const BASE = apiPath("/content/npm/packages/");

export interface ListNpmContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listNpmContent(params: ListNpmContentParams): Promise<PulpPage<NpmContent>> {
  return pulpFetch<PulpPage<NpmContent>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED live: this endpoint has no `name__contains`/`name__icontains`
 * at all (not even `name__contains`) - only an exact-match `name` filter -
 * so a partial-text search box can't be implemented as a server-side
 * query param the way every other list page in this app does. Fetches
 * every package in one large page instead, for client-side search
 * (src/hooks/useClientSideSearch.ts) - bounded, not a true
 * unbounded-catalog fetch, which is a realistic assumption at the
 * self-hosted scale this app targets (CLAUDE.md "Stay 100% local"). */
export async function listAllNpmContent(): Promise<NpmContent[]> {
  const page = await listNpmContent({ limit: 10000, offset: 0 });
  return page.results;
}

/**
 * VERIFIED live: like maven, this endpoint is asynchronous (202 + task) and
 * accepts an optional `repository` field directly - a genuine one-shot
 * upload-and-attach, not the usual two-step upload-then-modify. There's no
 * content href to `modify()` with anyway, since the response here is just a
 * task, not the created content object. Also VERIFIED: the write schema
 * here is `npm.Package` - NOT `NpmPackageUpload` (that one's for the
 * separate chunked-upload sub-path).
 */
export function uploadNpmContent(
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
