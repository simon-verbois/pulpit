import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  HuggingFaceDistribution,
  HuggingFaceDistributionCreate,
} from "./types";

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
  return pulpFetch<PulpPage<HuggingFaceDistribution>>(`${BASE}${buildQuery(params)}`);
}

export function createHuggingFaceDistribution(
  data: HuggingFaceDistributionCreate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteHuggingFaceDistribution(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
