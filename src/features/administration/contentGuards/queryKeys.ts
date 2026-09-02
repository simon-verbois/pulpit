export const contentGuardsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "administration", "contentGuards", params] as const;

export const contentGuardsListRootKey = [
  "pulp",
  "administration",
  "contentGuards",
] as const;

export const contentGuardDetailKey = (href: string) =>
  ["pulp", "administration", "contentGuards", "detail", href] as const;
