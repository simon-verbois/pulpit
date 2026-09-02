export const containerRepositoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "container", "repositories", params] as const;

export const containerRepositoriesListRootKey = [
  "pulp",
  "container",
  "repositories",
] as const;

export const containerRepositoryByNameKey = (name: string) =>
  ["pulp", "container", "repositories", "byName", name] as const;

/** See rpmRepositoryVersionsKey's doc comment (src/features/rpm/repositories/queryKeys.ts)
 * for why `params` is only appended when given. */
export function containerRepositoryVersionsKey(
  versionsHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "container", "repositoryVersions", versionsHref, params] as const)
    : (["pulp", "container", "repositoryVersions", versionsHref] as const);
}
