export const mavenRepositoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "maven", "repositories", params] as const;

export const mavenRepositoriesListRootKey = ["pulp", "maven", "repositories"] as const;

export const mavenRepositoryByNameKey = (name: string) =>
  ["pulp", "maven", "repositories", "byName", name] as const;

/**
 * `params` is only appended when given - a caller invalidating every
 * paginated variant of a repository's versions list (e.g. after content is
 * added) passes just `versionsHref`, relying on TanStack Query's
 * prefix-based partial matching. Always appending `params` (even as
 * `undefined`) would break that: an explicit `undefined` element doesn't
 * prefix-match a real `{ limit, offset }` object at the same position.
 */
export function mavenRepositoryVersionsKey(
  versionsHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "maven", "repositoryVersions", versionsHref, params] as const)
    : (["pulp", "maven", "repositoryVersions", versionsHref] as const);
}
