import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, DebContent } from "./types";

const BASE = apiPath("/content/deb/packages/");

export interface ListDebContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  package__icontains?: string;
  repository_version?: string;
}

export function listDebContent(
  params: ListDebContentParams,
): Promise<PulpPage<DebContent>> {
  return pulpFetch<PulpPage<DebContent>>(`${BASE}${buildQuery(params)}`);
}

/**
 * VERIFIED live: like maven/npm/python, this endpoint is itself
 * asynchronous (202 + task) and accepts an optional `repository` field
 * directly - a genuine one-shot upload-and-attach, not the usual two-step
 * upload-then-modify. There's no content href to `modify()` with anyway,
 * since the response here is just a task, not the created content object.
 */
export function uploadDebContent(
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
