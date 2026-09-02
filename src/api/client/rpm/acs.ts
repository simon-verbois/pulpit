import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import { getTaskGroup } from "../tasks";
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

/**
 * Triggers a refresh (VERIFIED live: `POST {href}refresh/` returns
 * `{task_group: <href>}`, not `{task: <href>}` - a distinct response shape
 * from every other RPM mutation in this app). Resolves it to the group's
 * first task href, which the live instance already populates by the time
 * this call returns (VERIFIED: even immediately after the POST, the task
 * group's `tasks` array already has an entry in "running" state) - see
 * `getTaskGroup`.
 */
export async function refreshAlternateContentSource(
  href: string,
): Promise<{ task: string }> {
  const { task_group: taskGroupHref } = await pulpFetch<{ task_group: string }>(
    `${href}refresh/`,
    {
      method: "POST",
    },
  );
  const taskGroup = await getTaskGroup(taskGroupHref);
  const firstTask = taskGroup.tasks[0];
  if (!firstTask) {
    throw new Error(
      "Alternate content source refresh started, but no task was found to track.",
    );
  }
  return { task: firstTask.pulp_href };
}
