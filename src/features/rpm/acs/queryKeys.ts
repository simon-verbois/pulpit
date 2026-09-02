export const acsQueryKey = (params?: { limit: number; offset: number }) =>
  ["pulp", "rpm", "acs", params] as const;

export const acsListRootKey = ["pulp", "rpm", "acs"] as const;
