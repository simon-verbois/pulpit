export const mavenRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "maven", "remotes", params] as const;

export const mavenRemotesListRootKey = ["pulp", "maven", "remotes"] as const;
