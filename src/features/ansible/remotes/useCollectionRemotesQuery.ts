import { useQuery } from "@tanstack/react-query";

import {
  listCollectionRemotes,
  type ListCollectionRemotesParams,
} from "../../../api/client/ansible/collectionRemotes";
import { collectionRemotesQueryKey } from "./queryKeys";

export function useCollectionRemotesQuery(params: ListCollectionRemotesParams) {
  return useQuery({
    queryKey: collectionRemotesQueryKey(params),
    queryFn: () => listCollectionRemotes(params),
    placeholderData: (previous) => previous,
  });
}
