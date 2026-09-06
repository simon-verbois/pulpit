export const huggingFaceRemotesQueryKey = (params?: {
  limit: number;
  offset: number;
  name__icontains?: string;
}) => ["pulp", "hugging_face", "remotes", params] as const;

export const huggingFaceRemotesListRootKey = ["pulp", "hugging_face", "remotes"] as const;
