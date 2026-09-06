export const fileDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "file", "distributions", params] as const;

export const fileDistributionsListRootKey = ["pulp", "file", "distributions"] as const;
