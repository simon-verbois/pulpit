import { apiPath, pulpFetch } from "../httpClient";
import { buildQuery } from "../queryString";
import type {
  PulpPage,
  RoleAssignment,
  RoleAssignmentCreate,
  User,
  UserCreate,
  UserUpdate,
} from "./types";

const BASE = apiPath("/users/");

export interface ListUsersParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
  username__icontains?: string;
}

export function listUsers(params: ListUsersParams): Promise<PulpPage<User>> {
  return pulpFetch<PulpPage<User>>(`${BASE}${buildQuery(params)}`);
}

const PICKER_PAGE_SIZE = 100;

/** Fetches every user page - used to populate "assign to user" pickers. */
export async function listAllUsers(): Promise<User[]> {
  const users: User[] = [];
  let offset = 0;

  while (true) {
    const page = await listUsers({ limit: PICKER_PAGE_SIZE, offset });
    users.push(...page.results);

    if (users.length >= page.count || page.results.length === 0) return users;
    offset += page.results.length;
  }
}

/** Fetches a user directly by its own href, e.g. to resolve a task's
 * `created_by` into a display name. */
export function getUser(href: string): Promise<User> {
  return pulpFetch<User>(href);
}

/** Users are identified by a numeric id in their href, but `username` is
 * unique too - Pulpit routes by username (like every other name-based
 * route in this app) and looks the href up via an exact-match filter,
 * same rationale as getRpmRepositoryByName. */
export async function getUserByUsername(username: string): Promise<User | null> {
  const page = await pulpFetch<PulpPage<User>>(
    `${BASE}${buildQuery({ username, limit: 1, offset: 0 })}`,
  );
  return page.results[0] ?? null;
}

/** Synchronous (VERIFIED live: 201, no task) - unlike RPM/Ansible/Container,
 * this whole domain never uses tasks. */
export function createUser(data: UserCreate): Promise<User> {
  return pulpFetch<User>(BASE, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** VERIFIED live: synchronous (200), not 202+task. */
export function updateUser(href: string, data: UserUpdate): Promise<User> {
  return pulpFetch<User>(href, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** VERIFIED live: synchronous (204), not 202+task. */
export function deleteUser(href: string): Promise<void> {
  return pulpFetch<void>(href, { method: "DELETE" });
}

export interface ListUserRolesParams {
  [key: string]: string | number | boolean | undefined;
  limit: number;
  offset: number;
}

export function listUserRoles(
  userHref: string,
  params: ListUserRolesParams,
): Promise<PulpPage<RoleAssignment>> {
  return pulpFetch<PulpPage<RoleAssignment>>(`${userHref}roles/${buildQuery(params)}`);
}

/** Assigns a role to this user - globally (`content_object: null`,
 * VERIFIED live: must be sent explicitly, omitting it is a 400) or scoped
 * to one specific object (`content_object` = that object's href). */
export function assignUserRole(
  userHref: string,
  data: RoleAssignmentCreate,
): Promise<RoleAssignment> {
  return pulpFetch<RoleAssignment>(`${userHref}roles/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function unassignUserRole(userRoleHref: string): Promise<void> {
  return pulpFetch<void>(userRoleHref, { method: "DELETE" });
}
