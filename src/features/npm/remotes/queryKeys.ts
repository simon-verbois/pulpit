export const npmRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "npm", "remotes", params] as const;

export const npmRemotesListRootKey = ["pulp", "npm", "remotes"] as const;
