export const containerDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "container", "distributions", params] as const;

export const containerDistributionsListRootKey = [
  "pulp",
  "container",
  "distributions",
] as const;
