export const collectionVersionsListRootKey = [
  "pulp",
  "ansible",
  "collectionVersions",
] as const;

export const collectionVersionsQueryKey = (params?: Record<string, unknown>) =>
  ["pulp", "ansible", "collectionVersions", params] as const;
