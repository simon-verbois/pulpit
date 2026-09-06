export const debDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "deb", "distributions", params] as const;

export const debDistributionsListRootKey = ["pulp", "deb", "distributions"] as const;
