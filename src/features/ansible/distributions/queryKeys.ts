export const ansibleDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "ansible", "distributions", params] as const;

export const ansibleDistributionsListRootKey = [
  "pulp",
  "ansible",
  "distributions",
] as const;
