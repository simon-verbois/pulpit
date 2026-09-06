import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, MavenContent } from "./types";

const BASE = apiPath("/content/maven/artifact/");

export interface ListMavenContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  group_id__icontains?: string;
  repository_version?: string;
}

export function listMavenContent(
  params: ListMavenContentParams,
): Promise<PulpPage<MavenContent>> {
  return pulpFetch<PulpPage<MavenContent>>(`${BASE}${buildQuery(params)}`);
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
