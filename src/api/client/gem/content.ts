import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, GemContent } from "./types";

const BASE = apiPath("/content/gem/gem/");

export interface ListGemContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listGemContent(params: ListGemContentParams): Promise<PulpPage<GemContent>> {
  return pulpFetch<PulpPage<GemContent>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED live: this endpoint has no `name__contains`/`name__icontains`
 * at all (not even `name__contains`) - only an exact-match `name` filter -
 * so a partial-text search box can't be implemented as a server-side
 * query param the way every other list page in this app does. Fetches
 * every gem in one large page instead, for client-side search
 * (src/hooks/useClientSideSearch.ts) - bounded, not a true
 * unbounded-catalog fetch, which is a realistic assumption at the
 * self-hosted scale this app targets (CLAUDE.md "Stay 100% local"). */
export async function listAllGemContent(): Promise<GemContent[]> {
  const page = await listGemContent({ limit: 10000, offset: 0 });
  return page.results;
}

/**
 * One-shot gem upload (VERIFIED against the live schema: unlike File/
 * Python/Maven, there's no `relative_path` here at all - a gem's identity
 * comes entirely from its own embedded metadata, parsed server-side).
 * Same as every other plugin's upload flow in this app: this endpoint only
 * creates the content unit, no `repository` field in this call - adding it
 * to a repository is a separate `modify` call.
 */
export function uploadGemContent(file: File): Promise<GemContent> {
  const formData = new FormData();
  formData.append("file", file);
  return pulpFetch<GemContent>(BASE, {
    method: "POST",
    body: formData,
  });
}
