import { useQuery } from "@tanstack/react-query";

import {
  searchCollectionVersions,
  type SearchCollectionVersionsParams,
} from "../../../api/client/ansible/search";

export function useSearchCollectionVersionsQuery(params: SearchCollectionVersionsParams) {
  return useQuery({
    queryKey: ["pulp", "ansible", "search", "collectionVersions", params],
    queryFn: () => searchCollectionVersions(params),
    placeholderData: (previous) => previous,
  });
}
