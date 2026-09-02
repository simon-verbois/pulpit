export const rpmRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "rpm", "remotes", params] as const;

export const rpmRemotesListRootKey = ["pulp", "rpm", "remotes"] as const;

export const rpmUlnRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "rpm", "ulnRemotes", params] as const;

export const rpmUlnRemotesListRootKey = ["pulp", "rpm", "ulnRemotes"] as const;
