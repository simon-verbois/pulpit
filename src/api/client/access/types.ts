// VERIFIED against the live OpenAPI schema of a pulpcore 3.116.0 instance
// (fetched from /pulp/api/v3/docs/api.json - see docs/PULP_API.md "Access
// endpoints"). Unlike RPM/Ansible/Container, this whole domain is
// pulpcore-core (not plugin-specific) and every mutation here is
// synchronous (VERIFIED live: 200/201/204, never a task) - Django auth-model
// CRUD, not a content-processing pipeline.

export interface PulpPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface HiddenField {
  name: string;
  is_set: boolean;
}

export interface User {
  pulp_href: string;
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  /** VERIFIED live: write-only - a GET never echoes it back, only whether
   * one `is_set` (same pattern as every remote's proxy/auth credentials). */
  hidden_fields: HiddenField[];
}

export interface UserCreate {
  username: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_staff?: boolean;
  is_active?: boolean;
}

/** PATCH body - every field optional (partial update). Omitting `password`
 * leaves it unchanged - there is no "clear the password" concept. */
export interface UserUpdate {
  username?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_staff?: boolean;
  is_active?: boolean;
}

export interface Group {
  pulp_href: string;
  id: number;
  name: string;
}

export interface GroupCreate {
  name: string;
}

export interface GroupUser {
  pulp_href: string;
  username: string;
}

export interface Role {
  pulp_href: string;
  name: string;
  description: string | null;
  permissions: string[];
  /** VERIFIED live: pulpcore/plugins ship ~180+ built-in roles (the
   * viewer/owner/creator pattern per content type) with `locked: true` -
   * read-only, can't be edited or deleted. Only custom (unlocked) roles
   * support PUT/PATCH/DELETE. */
  locked: boolean;
}

export interface RoleCreate {
  name: string;
  description?: string;
  permissions: string[];
}

/** PATCH body - every field optional (partial update). Only ever sent for
 * an unlocked (custom) role - see Role.locked. */
export interface RoleUpdate {
  name?: string;
  description?: string;
  permissions?: string[];
}

/**
 * A role assignment - either global (`content_object: null`) or scoped to
 * one specific object (`content_object` = that object's href). VERIFIED
 * live gotcha: POSTing without `content_object` at all is rejected (400,
 * "Either 'content_object' or 'content_object_prn' needs to be specified") -
 * a global assignment must send `content_object: null` explicitly.
 */
export interface RoleAssignment {
  pulp_href: string;
  role: string;
  content_object: string | null;
  content_object_prn: string | null;
  description: string | null;
  permissions: string[];
}

export interface RoleAssignmentCreate {
  /** VERIFIED live: the role's *name* (e.g. "rpm.rpmrepository_viewer"),
   * not its href - unlike every other cross-reference in this API. */
  role: string;
  content_object: string | null;
}

/** The generic `{object}add_role/` / `{object}remove_role/` body shape,
 * usable on any RBAC-protected object across every plugin (repositories,
 * remotes, distributions, content guards...). */
export interface ObjectRoleChange {
  role: string;
  users?: string[];
  groups?: string[];
}

export interface ObjectRoleAssignment {
  role: string;
  users: string[];
  groups: string[];
}

export interface ObjectRolesResponse {
  roles: ObjectRoleAssignment[];
}

export interface MyPermissionsResponse {
  permissions: string[];
}
