import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RpmAlternateContentSource,
  RpmAlternateContentSourceCreate,
  RpmAlternateContentSourceUpdate,
} from "./types";

const BASE = apiPath("/acs/rpm/rpm/");

export interface ListAcsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
}

export function listAlternateContentSources(
  params: ListAcsParams,
): Promise<PulpPage<RpmAlternateContentSource>> {
  return pulpFetch<PulpPage<RpmAlternateContentSource>>(`${BASE}${buildQuery(params)}`);
}

/** VERIFIED against the live instance: synchronous (201, no task), same as
 * repository/remote create. */
export function createAlternateContentSource(
  data: RpmAlternateContentSourceCreate,
): Promise<RpmAlternateContentSource> {
  return pulpFetch<RpmAlternateContentSource>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAlternateContentSource(
  href: string,
  data: RpmAlternateContentSourceUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAlternateContentSource(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** Return the task-group href so every child and dispatch completion are tracked. */
export async function refreshAlternateContentSource(
  href: string,
): Promise<{ task: string }> {
  const { task_group: taskGroupHref } = await pulpFetch<{ task_group: string }>(
    `${href}refresh/`,
    {
      method: "POST",
    },
  );
  return { task: taskGroupHref };
}
