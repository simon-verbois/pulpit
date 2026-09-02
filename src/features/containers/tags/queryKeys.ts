export const containerTagsListRootKey = ["pulp", "container", "tags"] as const;

export const containerTagsQueryKey = (params?: Record<string, unknown>) =>
  ["pulp", "container", "tags", params] as const;
