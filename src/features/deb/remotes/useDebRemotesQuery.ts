import { useQuery } from "@tanstack/react-query";

import {
  listDebRemotes,
  type ListDebRemotesParams,
} from "../../../api/client/deb/remotes";
import { debRemotesQueryKey } from "./queryKeys";

export function useDebRemotesQuery(params: ListDebRemotesParams) {
  return useQuery({
    queryKey: debRemotesQueryKey(params),
    queryFn: () => listDebRemotes(params),
    placeholderData: (previous) => previous,
  });
}
