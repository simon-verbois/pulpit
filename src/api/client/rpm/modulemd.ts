import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RpmModulemd,
  RpmModulemdDefaults,
  RpmModulemdObsolete,
} from "./types";

const MODULEMDS_BASE = apiPath("/content/rpm/modulemds/");
const DEFAULTS_BASE = apiPath("/content/rpm/modulemd_defaults/");
const OBSOLETES_BASE = apiPath("/content/rpm/modulemd_obsoletes/");

export interface ContentListParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  repository_version?: string;
}

export function listRpmModulemds(
  params: ContentListParams,
): Promise<PulpPage<RpmModulemd>> {
  return pulpFetch<PulpPage<RpmModulemd>>(`${MODULEMDS_BASE}${buildQuery(params)}`);
}

export function listRpmModulemdDefaults(
  params: ContentListParams,
): Promise<PulpPage<RpmModulemdDefaults>> {
  return pulpFetch<PulpPage<RpmModulemdDefaults>>(
    `${DEFAULTS_BASE}${buildQuery(params)}`,
  );
}

export function listRpmModulemdObsoletes(
  params: ContentListParams,
): Promise<PulpPage<RpmModulemdObsolete>> {
  return pulpFetch<PulpPage<RpmModulemdObsolete>>(
    `${OBSOLETES_BASE}${buildQuery(params)}`,
  );
}
