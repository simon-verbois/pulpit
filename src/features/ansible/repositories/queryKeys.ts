export const ansibleRepositoriesListRootKey = [
  "pulp",
  "ansible",
  "repositories",
] as const;

export const ansibleRepositoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "ansible", "repositories", params] as const;

export const ansibleRepositoryByNameKey = (name: string) =>
  ["pulp", "ansible", "repositories", "byName", name] as const;

/** `params` is only appended when given - see rpm/repositories/queryKeys.ts's
 * identical rationale (partial prefix-match invalidation after a sync). */
export function ansibleRepositoryVersionsKey(
  versionsHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "ansible", "repositoryVersions", versionsHref, params] as const)
    : (["pulp", "ansible", "repositoryVersions", versionsHref] as const);
}
