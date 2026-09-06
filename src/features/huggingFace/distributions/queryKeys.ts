export const huggingFaceDistributionsQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
  repository?: string;
}) => ["pulp", "hugging_face", "distributions", params] as const;

export const huggingFaceDistributionsListRootKey = [
  "pulp",
  "hugging_face",
  "distributions",
] as const;
