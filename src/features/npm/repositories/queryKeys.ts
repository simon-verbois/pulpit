export const npmRepositoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "npm", "repositories", params] as const;

export const npmRepositoriesListRootKey = ["pulp", "npm", "repositories"] as const;

export const npmRepositoryByNameKey = (name: string) =>
  ["pulp", "npm", "repositories", "byName", name] as const;

/**
 * `params` is only appended when given - a caller invalidating every
 * paginated variant of a repository's versions list (e.g. after a sync
 * completes) passes just `versionsHref`, relying on TanStack Query's
 * prefix-based partial matching. Always appending `params` (even as
 * `undefined`) would break that: an explicit `undefined` element doesn't
 * prefix-match a real `{ limit, offset }` object at the same position.
 */
export function npmRepositoryVersionsKey(
  versionsHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "npm", "repositoryVersions", versionsHref, params] as const)
    : (["pulp", "npm", "repositoryVersions", versionsHref] as const);
}
