export const fileRepositoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "file", "repositories", params] as const;

export const fileRepositoriesListRootKey = ["pulp", "file", "repositories"] as const;

export const fileRepositoryByNameKey = (name: string) =>
  ["pulp", "file", "repositories", "byName", name] as const;

/**
 * `params` is only appended when given - a caller invalidating every
 * paginated variant of a repository's versions list (e.g. after a sync
 * completes) passes just `versionsHref`, relying on TanStack Query's
 * prefix-based partial matching. Always appending `params` (even as
 * `undefined`) would break that: an explicit `undefined` element doesn't
 * prefix-match a real `{ limit, offset }` object at the same position.
 */
export function fileRepositoryVersionsKey(
  versionsHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "file", "repositoryVersions", versionsHref, params] as const)
    : (["pulp", "file", "repositoryVersions", versionsHref] as const);
}
