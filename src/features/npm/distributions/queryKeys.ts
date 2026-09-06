export const npmDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "npm", "distributions", params] as const;

export const npmDistributionsListRootKey = ["pulp", "npm", "distributions"] as const;
