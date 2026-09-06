import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, HuggingFaceContent } from "./types";

const BASE = apiPath("/content/hugging_face/hugging-face/");

export interface ListHuggingFaceContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  relative_path__icontains?: string;
  repository_version?: string;
}

export function listHuggingFaceContent(
  params: ListHuggingFaceContentParams,
): Promise<PulpPage<HuggingFaceContent>> {
  return pulpFetch<PulpPage<HuggingFaceContent>>(`${BASE}${buildQuery(params)}`);
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
