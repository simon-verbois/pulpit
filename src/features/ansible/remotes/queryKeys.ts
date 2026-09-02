type ListParams = { limit: number; offset: number; name__icontains?: string };

export const collectionRemotesQueryKey = (params?: ListParams) =>
  ["pulp", "ansible", "remotes", "collection", params] as const;
export const collectionRemotesListRootKey = [
  "pulp",
  "ansible",
  "remotes",
  "collection",
] as const;

export const gitRemotesQueryKey = (params?: ListParams) =>
  ["pulp", "ansible", "remotes", "git", params] as const;
export const gitRemotesListRootKey = ["pulp", "ansible", "remotes", "git"] as const;

export const roleRemotesQueryKey = (params?: ListParams) =>
  ["pulp", "ansible", "remotes", "role", params] as const;
export const roleRemotesListRootKey = ["pulp", "ansible", "remotes", "role"] as const;
