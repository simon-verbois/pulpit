import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmRepoMetadataFile } from "./types";

const BASE = apiPath("/content/rpm/repo_metadata_files/");

export interface ContentListParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listRpmRepoMetadataFiles(
  params: ContentListParams,
): Promise<PulpPage<RpmRepoMetadataFile>> {
  return pulpFetch<PulpPage<RpmRepoMetadataFile>>(`${BASE}${buildQuery(params)}`);
}
