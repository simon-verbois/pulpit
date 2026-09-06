export const gemRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "gem", "remotes", params] as const;

export const gemRemotesListRootKey = ["pulp", "gem", "remotes"] as const;
