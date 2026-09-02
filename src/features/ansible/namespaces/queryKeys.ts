export const galaxyNamespacesQueryKey = (
  distributionBasePath: string,
  params?: Record<string, unknown>,
) => ["pulp", "ansible", "galaxyNamespaces", distributionBasePath, params] as const;

export const galaxyNamespacesListRootKey = (distributionBasePath: string) =>
  ["pulp", "ansible", "galaxyNamespaces", distributionBasePath] as const;
