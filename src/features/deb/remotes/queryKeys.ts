export const debRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "deb", "remotes", params] as const;

export const debRemotesListRootKey = ["pulp", "deb", "remotes"] as const;
