import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type { PulpPage, Role, RoleCreate, RoleUpdate } from "./types";

const BASE = apiPath("/roles/");

export interface ListRolesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
  locked?: boolean;
}

export function listRoles(params: ListRolesParams): Promise<PulpPage<Role>> {
  return pulpFetch<PulpPage<Role>>(`${BASE}${buildQuery(params)}`);
}

/** Fetches every role page - used to populate "assign this role" pickers
 * and to derive the known-permissions list (see PermissionsPicker.tsx: no
 * dedicated "list all permissions" endpoint exists, so the permission
 * strings already used by *some* role - built-in or custom - are the best
 * available source). VERIFIED live: 184 built-in roles on a fresh
 * instance, well under one page at this limit. */
export async function listAllRoles(): Promise<Role[]> {
  const page = await listRoles({ limit: 500, offset: 0 });
  return page.results;
}

/** Roles are identified by a numeric id in their href, but `name` is
 * unique too - routed by name like every other name-based route in this
 * app. Role names contain dots (e.g. "rpm.rpmrepository_viewer"), which
 * don't need special handling in a name__iexact filter. */
export async function getRoleByName(name: string): Promise<Role | null> {
  const page = await pulpFetch<PulpPage<Role>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  return page.results[0] ?? null;
}

/** Synchronous (VERIFIED live: 201, no task). */
export function createRole(data: RoleCreate): Promise<Role> {
  return pulpFetch<Role>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** VERIFIED live: synchronous (200). Only ever called on an unlocked
 * (custom) role - see Role.locked. */
export function updateRole(href: string, data: RoleUpdate): Promise<Role> {
  return pulpFetch<Role>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** VERIFIED live: synchronous (204). */
export function deleteRole(href: string): Promise<void> {
  return pulpFetch<void>(href, { method: "DELETE" });
}
