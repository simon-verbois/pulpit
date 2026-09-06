import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, PythonContent } from "./types";

const BASE = apiPath("/content/python/packages/");

export interface ListPythonContentParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository_version?: string;
}

export function listPythonContent(
  params: ListPythonContentParams,
): Promise<PulpPage<PythonContent>> {
  return pulpFetch<PulpPage<PythonContent>>(`${BASE}${buildQuery(params)}`);
}

/**
 * VERIFIED live: like maven/npm (and unlike this app's other autopublish
 * plugins, RPM/File), this endpoint is itself asynchronous (202 + task) and
 * accepts an optional `repository` field directly - a genuine one-shot
 * upload-and-attach, not the usual two-step upload-then-modify. There's no
 * content href to `modify()` with anyway, since the response here is just a
 * task, not the created content object.
 */
export function uploadPythonContent(
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
