export const rolesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  locked?: boolean;
}) => ["pulp", "access", "roles", params] as const;

export const rolesListRootKey = ["pulp", "access", "roles"] as const;
