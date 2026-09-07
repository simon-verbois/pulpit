export const containerTagsQueryKey = (params?: Record<string, unknown>) =>
  ["pulp", "container", "tags", params] as const;
