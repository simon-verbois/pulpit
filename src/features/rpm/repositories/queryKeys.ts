export const rpmRepositoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "rpm", "repositories", params] as const;

export const rpmRepositoriesListRootKey = ["pulp", "rpm", "repositories"] as const;

export const rpmRepositoryByNameKey = (name: string) =>
  ["pulp", "rpm", "repositories", "byName", name] as const;

/**
 * `params` is only appended when given - a caller invalidating every
 * paginated variant of a repository's versions list (e.g. after a sync
 * completes) passes just `versionsHref`, relying on TanStack Query's
 * prefix-based partial matching. Always appending `params` (even as
 * `undefined`) would break that: an explicit `undefined` element doesn't
 * prefix-match a real `{ limit, offset }` object at the same position.
 */
export function rpmRepositoryVersionsKey(
  versionsHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "rpm", "repositoryVersions", versionsHref, params] as const)
    : (["pulp", "rpm", "repositoryVersions", versionsHref] as const);
}

export const rpmRepositoryVersionOptionsKey = (versionsHref: string) =>
  ["pulp", "rpm", "repositoryVersions", versionsHref, "options"] as const;
