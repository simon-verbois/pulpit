import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, FileContent } from "./types";

const BASE = apiPath("/content/file/files/");
const UPLOAD = apiPath("/content/file/files/upload/");

export interface ListFileContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  relative_path__icontains?: string;
  repository_version?: string;
}

export function listFileContent(
  params: ListFileContentParams,
): Promise<PulpPage<FileContent>> {
  return pulpFetch<PulpPage<FileContent>>(`${BASE}${buildQuery(params)}`);
}

/**
 * One-shot file upload (VERIFIED against the live schema: unlike RPM's
 * package upload, `relative_path` is required here - a raw file has no
 * inherent path of its own, unlike an RPM's embedded metadata). Same as
 * RPM: this endpoint only creates the content unit, no `repository` field
 * in this call despite the main collection's own create schema accepting
 * one - adding it to a repository is a separate `modify` call, kept
 * consistent with every other plugin's upload flow in this app.
 */
export function uploadFileContent(
  file: File,
  relativePath: string,
): Promise<FileContent> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("relative_path", relativePath);
  return pulpFetch<FileContent>(UPLOAD, {
    method: "POST",
    body: formData,
  });
}
