export const rpmDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "rpm", "distributions", params] as const;

export const rpmDistributionsListRootKey = ["pulp", "rpm", "distributions"] as const;
