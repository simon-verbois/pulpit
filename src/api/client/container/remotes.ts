import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  ContainerRemote,
  ContainerRemoteCreate,
  ContainerRemoteUpdate,
  PulpPage,
} from "./types";

const BASE = apiPath("/remotes/container/container/");

export interface ListContainerRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listContainerRemotes(
  params: ListContainerRemotesParams,
): Promise<PulpPage<ContainerRemote>> {
  return pulpFetch<PulpPage<ContainerRemote>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every remote page - used to populate the "remote" select in the
 * repository create/edit forms. */
export async function listAllContainerRemotes(): Promise<ContainerRemote[]> {
  const page = await listContainerRemotes({ limit: 100, offset: 0 });
  return page.results;
}

export function createContainerRemote(
  data: ContainerRemoteCreate,
): Promise<ContainerRemote> {
  return pulpFetch<ContainerRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteContainerRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}

/** VERIFIED against the live schema: update is asynchronous (202 + task),
 * same as RPM/Ansible remotes. */
export function updateContainerRemote(
  href: string,
  data: ContainerRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
