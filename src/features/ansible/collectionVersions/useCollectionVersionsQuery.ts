import { useQuery } from "@tanstack/react-query";

import {
  listCollectionVersions,
  type ListCollectionVersionsParams,
} from "../../../api/client/ansible/collectionVersions";
import { collectionVersionsQueryKey } from "./queryKeys";

export function useCollectionVersionsQuery(params: ListCollectionVersionsParams) {
  return useQuery({
    queryKey: collectionVersionsQueryKey(params),
    queryFn: () => listCollectionVersions(params),
    placeholderData: (previous) => previous,
  });
}
