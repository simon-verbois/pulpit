export const ansibleRolesListRootKey = ["pulp", "ansible", "roles"] as const;

export const ansibleRolesQueryKey = (params?: Record<string, unknown>) =>
  ["pulp", "ansible", "roles", params] as const;
