export const usersQueryKey = (params?: {
  limit: number;
  offset: number;
  username__icontains?: string;
}) => ["pulp", "access", "users", params] as const;

export const usersListRootKey = ["pulp", "access", "users"] as const;

export const userByUsernameKey = (username: string) =>
  ["pulp", "access", "users", "byUsername", username] as const;

export const userByHrefKey = (href: string) =>
  ["pulp", "access", "users", "byHref", href] as const;

export function userRolesKey(
  userHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "access", "userRoles", userHref, params] as const)
    : (["pulp", "access", "userRoles", userHref] as const);
}
