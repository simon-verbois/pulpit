export const mavenDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "maven", "distributions", params] as const;

export const mavenDistributionsListRootKey = ["pulp", "maven", "distributions"] as const;
