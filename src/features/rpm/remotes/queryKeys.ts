export const rpmRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "rpm", "remotes", params] as const;

export const rpmRemotesListRootKey = ["pulp", "rpm", "remotes"] as const;

/** Nested under rpmRemotesListRootKey so a remote edit/delete refreshes the
 * repository Overview's "Default remote" too. */
export const rpmRemoteByHrefKey = (href: string) =>
  [...rpmRemotesListRootKey, "byHref", href] as const;

export const rpmUlnRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "rpm", "ulnRemotes", params] as const;

export const rpmUlnRemotesListRootKey = ["pulp", "rpm", "ulnRemotes"] as const;

/** Standard + ULN remotes for the repository "Default remote" select. Nested
 * under rpmRemotesListRootKey so standard-remote invalidations refresh it;
 * ULN remote mutations invalidate it explicitly. */
export const rpmRemoteOptionsQueryKey = [...rpmRemotesListRootKey, "options"] as const;
