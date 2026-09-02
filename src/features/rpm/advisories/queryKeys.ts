export const rpmAdvisoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  q?: string;
  repository_version?: string;
}) => ["pulp", "rpm", "advisories", params] as const;

export const rpmAdvisoriesListRootKey = ["pulp", "rpm", "advisories"] as const;
