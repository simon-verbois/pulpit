export const fileRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "file", "remotes", params] as const;

export const fileRemotesListRootKey = ["pulp", "file", "remotes"] as const;

export const fileGitRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "file", "gitRemotes", params] as const;

export const fileGitRemotesListRootKey = ["pulp", "file", "gitRemotes"] as const;
