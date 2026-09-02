import { pulpFetch } from "../httpClient";
import type {
  MyPermissionsResponse,
  ObjectRoleChange,
  ObjectRolesResponse,
} from "./types";

/**
 * Generic per-object RBAC actions - VERIFIED live schema present on every
 * RBAC-protected object across every plugin (repositories, remotes,
 * distributions, content guards...), not specific to any one content type.
 * All synchronous (VERIFIED live: 200/201, never a task).
 *
 * These are a convenience layer over the same underlying UserRole/GroupRole
 * records users.ts/groups.ts manage from the user/group side - granting a
 * role here and looking it up via listUserRoles(user) shows the same
 * assignment either way.
 */

export function listObjectRoles(objectHref: string): Promise<ObjectRolesResponse> {
  return pulpFetch<ObjectRolesResponse>(`${objectHref}list_roles/`);
}

export function getObjectMyPermissions(
  objectHref: string,
): Promise<MyPermissionsResponse> {
  return pulpFetch<MyPermissionsResponse>(`${objectHref}my_permissions/`);
}

export function addObjectRole(
  objectHref: string,
  data: ObjectRoleChange,
): Promise<{ role: string; users: string[]; groups: string[] }> {
  return pulpFetch(`${objectHref}add_role/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function removeObjectRole(
  objectHref: string,
  data: ObjectRoleChange,
): Promise<{ role: string; users: string[]; groups: string[] }> {
  return pulpFetch(`${objectHref}remove_role/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
