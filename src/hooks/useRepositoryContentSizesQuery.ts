import { useQuery } from "@tanstack/react-query";

import {
  getRepositoryContentSizes,
  contentSizeKeys,
} from "../api/client/pulpitCore/contentSize";

export function useRepositoryContentSizesQuery() {
  return useQuery({
    queryKey: contentSizeKeys.repositories,
    queryFn: () => getRepositoryContentSizes(),
    staleTime: 5 * 60 * 1000,
  });
}
