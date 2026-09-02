import { useQuery } from "@tanstack/react-query";

import {
  listRpmRemotes,
  type ListRpmRemotesParams,
} from "../../../api/client/rpm/remotes";
import { rpmRemotesQueryKey } from "./queryKeys";

export function useRpmRemotesQuery(params: ListRpmRemotesParams) {
  return useQuery({
    queryKey: rpmRemotesQueryKey(params),
    queryFn: () => listRpmRemotes(params),
    placeholderData: (previous) => previous,
  });
}
