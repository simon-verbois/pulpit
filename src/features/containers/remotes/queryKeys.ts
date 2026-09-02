export const containerRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "container", "remotes", params] as const;

export const containerRemotesListRootKey = ["pulp", "container", "remotes"] as const;
