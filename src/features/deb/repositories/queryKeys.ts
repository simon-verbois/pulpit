export const debRepositoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "deb", "repositories", params] as const;

export const debRepositoriesListRootKey = ["pulp", "deb", "repositories"] as const;

export const debRepositoryByNameKey = (name: string) =>
  ["pulp", "deb", "repositories", "byName", name] as const;

/**
 * `params` is only appended when given - a caller invalidating every
 * paginated variant of a repository's versions list (e.g. after a sync
 * completes) passes just `versionsHref`, relying on TanStack Query's
 * prefix-based partial matching. Always appending `params` (even as
 * `undefined`) would break that: an explicit `undefined` element doesn't
 * prefix-match a real `{ limit, offset }` object at the same position.
 */
export function debRepositoryVersionsKey(
  versionsHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "deb", "repositoryVersions", versionsHref, params] as const)
    : (["pulp", "deb", "repositoryVersions", versionsHref] as const);
}
