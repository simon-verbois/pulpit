import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { RoleRemote, RoleRemoteCreate, RoleRemoteUpdate, PulpPage } from "./types";

const BASE = apiPath("/remotes/ansible/role/");

export interface ListRoleRemotesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listRoleRemotes(
  params: ListRoleRemotesParams,
): Promise<PulpPage<RoleRemote>> {
  return pulpFetch<PulpPage<RoleRemote>>(`${BASE}${buildQuery(params)}`);
}

export function createRoleRemote(data: RoleRemoteCreate): Promise<RoleRemote> {
  return pulpFetch<RoleRemote>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateRoleRemote(
  href: string,
  data: RoleRemoteUpdate,
): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteRoleRemote(href: string): Promise<{ task: string }> {
  return pulpFetch<{ task: string }>(href, { method: "DELETE" });
}
