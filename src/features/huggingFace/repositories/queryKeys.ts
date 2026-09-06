export const huggingFaceRepositoriesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "hugging_face", "repositories", params] as const;

export const huggingFaceRepositoriesListRootKey = [
  "pulp",
  "hugging_face",
  "repositories",
] as const;

export const huggingFaceRepositoryByNameKey = (name: string) =>
  ["pulp", "hugging_face", "repositories", "byName", name] as const;

/**
 * `params` is only appended when given - a caller invalidating every
 * paginated variant of a repository's versions list (e.g. after a sync
 * completes) passes just `versionsHref`, relying on TanStack Query's
 * prefix-based partial matching. Always appending `params` (even as
 * `undefined`) would break that: an explicit `undefined` element doesn't
 * prefix-match a real `{ limit, offset }` object at the same position.
 */
export function huggingFaceRepositoryVersionsKey(
  versionsHref: string,
  params?: { limit: number; offset: number },
) {
  return params
    ? (["pulp", "hugging_face", "repositoryVersions", versionsHref, params] as const)
    : (["pulp", "hugging_face", "repositoryVersions", versionsHref] as const);
}
