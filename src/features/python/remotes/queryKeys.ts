export const pythonRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "python", "remotes", params] as const;

export const pythonRemotesListRootKey = ["pulp", "python", "remotes"] as const;
