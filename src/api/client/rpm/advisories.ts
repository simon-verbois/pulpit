import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, RpmAdvisory } from "./types";

const BASE = apiPath("/content/rpm/advisories/");

export interface ListRpmAdvisoriesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  /** Pulp's full-text search filter across advisory fields (VERIFIED: no
   * `id__icontains`/`title__icontains` on this endpoint, only `q`). */
  q?: string;
  repository_version?: string;
}

export function listRpmAdvisories(
  params: ListRpmAdvisoriesParams,
): Promise<PulpPage<RpmAdvisory>> {
  return pulpFetch<PulpPage<RpmAdvisory>>(`${BASE}${buildQuery(params)}`);
}

/**
 * Uploads an advisory directly to a repository (one step - VERIFIED live:
 * unlike package upload, advisory create accepts a `repository` field
 * directly, no separate `modify` call needed).
 *
 * VERIFIED live (the surprising part): the `file` isn't a real-world
 * `updateinfo.xml` - pulp_rpm's advisory serializer does
 * `json.loads(data["file"].read())` and merges the result into the
 * advisory's fields, so it must be a JSON document matching `RpmAdvisory`'s
 * writable fields (id/title/type/description/issued_date/updated_date/
 * severity/pkglist/references/...), not XML. A raw updateinfo.xml upload
 * fails with a JSON decode error - confirmed against a live instance.
 * Syncing a repository whose remote has a real updateinfo.xml remains the
 * practical way most advisories actually get into Pulp.
 */
export function uploadRpmAdvisory(
  file: File,
  repositoryHref: string,
): Promise<{ task: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("repository", repositoryHref);
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: formData,
  });
}
