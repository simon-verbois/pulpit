export const pythonDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "python", "distributions", params] as const;

export const pythonDistributionsListRootKey = ["pulp", "python", "distributions"] as const;
