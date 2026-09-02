export const groupsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "access", "groups", params] as const;

export const groupsListRootKey = ["pulp", "access", "groups"] as const;

export const groupByNameKey = (name: string) =>
  ["pulp", "access", "groups", "byName", name] as const;

export function groupUsersKey(
  groupHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "access", "groupUsers", groupHref, params] as const)
    : (["pulp", "access", "groupUsers", groupHref] as const);
}

export function groupRolesKey(
  groupHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "access", "groupRoles", groupHref, params] as const)
    : (["pulp", "access", "groupRoles", groupHref] as const);
}
