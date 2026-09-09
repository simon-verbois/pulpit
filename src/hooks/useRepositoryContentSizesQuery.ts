import { useQuery } from "@tanstack/react-query";

import { getRepositoryContentSizes, contentSizeKeys } from "../api/client/contentSizes";

export function useRepositoryContentSizesQuery() {
  return useQuery({
    queryKey: contentSizeKeys.repositories,
    queryFn: ({ signal }) => getRepositoryContentSizes(signal),
    staleTime: 5 * 60 * 1000,
  });
}
