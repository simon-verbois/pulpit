import { listRepositoryDistributions } from "../distributionManagement";
import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, HuggingFaceDistribution } from "./types";

const BASE = apiPath("/distributions/hugging_face/hugging-face/");

export interface ListHuggingFaceDistributionsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}

export function listHuggingFaceDistributions(
  params: ListHuggingFaceDistributionsParams,
): Promise<PulpPage<HuggingFaceDistribution>> {
  if (params.repository)
    return listRepositoryDistributions<HuggingFaceDistribution>(
      "huggingFace",
      params.repository,
      params.limit,
      params.offset,
    );
  return pulpFetch<PulpPage<HuggingFaceDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function deleteHuggingFaceDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
