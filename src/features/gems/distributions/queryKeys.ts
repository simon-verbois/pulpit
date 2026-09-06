export const gemDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "gem", "distributions", params] as const;

export const gemDistributionsListRootKey = ["pulp", "gem", "distributions"] as const;
