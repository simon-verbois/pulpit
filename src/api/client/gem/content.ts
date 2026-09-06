import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, GemContent } from "./types";

const BASE = apiPath("/content/gem/gem/");

export interface ListGemContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository_version?: string;
}

export function listGemContent(params: ListGemContentParams): Promise<PulpPage<GemContent>> {
  return pulpFetch<PulpPage<GemContent>>(`${BASE}${buildQuery(params)}`);
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
