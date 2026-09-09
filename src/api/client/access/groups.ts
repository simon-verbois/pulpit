import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  Group,
  GroupCreate,
  GroupUser,
  PulpPage,
  RoleAssignment,
  RoleAssignmentCreate,
} from "./types";

const BASE = apiPath("/groups/");

export interface ListGroupsParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  name__icontains?: string;
}

export function listGroups(params: ListGroupsParams): Promise<PulpPage<Group>> {
  return pulpFetch<PulpPage<Group>>(`${BASE}${buildQuery(params)}`);
}

const PICKER_PAGE_SIZE = 100;

/** Fetches every group page - used to populate "assign to group" pickers. */
export async function listAllGroups(): Promise<Group[]> {
  const groups: Group[] = [];
  let offset = 0;

  while (true) {
    const page = await listGroups({ limit: PICKER_PAGE_SIZE, offset });
    groups.push(...page.results);

    if (groups.length >= page.count || page.results.length === 0) return groups;
    offset += page.results.length;
  }
}

/** Groups are identified by a numeric id in their href, but `name` is
 * unique too - routed by name like every other name-based route in this
 * app, same rationale as getRpmRepositoryByName. */
export async function getGroupByName(name: string): Promise<Group | null> {
  const page = await pulpFetch<PulpPage<Group>>(
    `${BASE}${buildQuery({ name, limit: 1, offset: 0 })}`,
  );
  return page.results[0] ?? null;
}

/** Synchronous (VERIFIED live: 201, no task). */
export function createGroup(data: GroupCreate): Promise<Group> {
  return pulpFetch<Group>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** VERIFIED live: synchronous (204), not 202+task. */
export function deleteGroup(href: string): Promise<void> {
  return pulpFetch<void>(href, { method: "DELETE" });
}

export interface ListParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
}

export function listGroupUsers(
  groupHref: string,
  params: ListParams,
): Promise<PulpPage<GroupUser>> {
  return pulpFetch<PulpPage<GroupUser>>(`${groupHref}users/${buildQuery(params)}`);
}

/** Fetches every member page so pickers never offer an existing member again. */
export async function listAllGroupUsers(groupHref: string): Promise<GroupUser[]> {
  const members: GroupUser[] = [];
  let offset = 0;

  while (true) {
    const page = await listGroupUsers(groupHref, {
      limit: PICKER_PAGE_SIZE,
      offset,
    });
    members.push(...page.results);

    if (members.length >= page.count || page.results.length === 0) return members;
    offset += page.results.length;
  }
}

/** A GroupUser's own `pulp_href` is the *user's* href (VERIFIED live, e.g.
 * "/pulp/api/v3/users/1/") - removeGroupUser needs that numeric id, not a
 * separate membership-specific one. */
export function groupUserId(member: GroupUser): number {
  return Number(member.pulp_href.split("/").filter(Boolean).pop());
}

/** Synchronous (VERIFIED live: 201). */
export function addGroupUser(groupHref: string, username: string): Promise<GroupUser> {
  return pulpFetch<GroupUser>(`${groupHref}users/`, {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

/** VERIFIED live: synchronous (204). Addressed by `{group}users/{id}/`
 * using the *user's numeric id* (VERIFIED: the add-member response's own
 * `pulp_href` is the user's href, e.g. `/pulp/api/v3/users/1/` - not a
 * separate membership-specific href - and the delete endpoint expects that
 * same numeric id back under the group's own `users/` sub-collection). */
export function removeGroupUser(groupHref: string, userId: number): Promise<void> {
  return pulpFetch<void>(`${groupHref}users/${userId}/`, {
    method: "DELETE",
  });
}

export function listGroupRoles(
  groupHref: string,
  params: ListParams,
): Promise<PulpPage<RoleAssignment>> {
  return pulpFetch<PulpPage<RoleAssignment>>(`${groupHref}roles/${buildQuery(params)}`);
}

export function assignGroupRole(
  groupHref: string,
  data: RoleAssignmentCreate,
): Promise<RoleAssignment> {
  return pulpFetch<RoleAssignment>(`${groupHref}roles/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function unassignGroupRole(groupRoleHref: string): Promise<void> {
  return pulpFetch<void>(groupRoleHref, { method: "DELETE" });
}
