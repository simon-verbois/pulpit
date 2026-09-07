import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, HuggingFaceContent } from "./types";

const BASE = apiPath("/content/hugging_face/hugging-face/");

export interface ListHuggingFaceContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listHuggingFaceContent(
  params: ListHuggingFaceContentParams,
): Promise<PulpPage<HuggingFaceContent>> {
  return pulpFetch<PulpPage<HuggingFaceContent>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED live: this endpoint has no `relative_path__contains`/
 * `relative_path__icontains` at all - only an exact-match `relative_path`
 * filter - so a partial-text search box can't be implemented as a
 * server-side query param the way every other list page in this app does.
 * Fetches every file in one large page instead, for client-side search
 * (src/hooks/useClientSideSearch.ts) - bounded, not a true
 * unbounded-catalog fetch, which is a realistic assumption at the
 * self-hosted scale this app targets (CLAUDE.md "Stay 100% local"). */
export async function listAllHuggingFaceContent(): Promise<HuggingFaceContent[]> {
  const page = await listHuggingFaceContent({ limit: 10000, offset: 0 });
  return page.results;
}

/**
 * One-shot upload (VERIFIED against the live schema: `repo_id` is required
 * here, unlike every other simple plugin's upload - a Hugging Face file's
 * identity is meaningless without knowing which Hub repo it came from).
 * Same as every other plugin's upload flow in this app: this endpoint only
 * creates the content unit, no `repository` field in this call - adding it
 * to a repository is a separate `modify` call.
 */
export function uploadHuggingFaceContent(
  file: File,
  relativePath: string,
  repoId: string,
): Promise<HuggingFaceContent> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("relative_path", relativePath);
  formData.append("repo_id", repoId);
  return pulpFetch<HuggingFaceContent>(BASE, {
    method: "POST",
    body: formData,
  });
}
