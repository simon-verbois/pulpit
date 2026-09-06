import { useQuery } from "@tanstack/react-query";

import { listNpmRemotes, type ListNpmRemotesParams } from "../../../api/client/npm/remotes";
import { npmRemotesQueryKey } from "./queryKeys";

export function useNpmRemotesQuery(params: ListNpmRemotesParams) {
  return useQuery({
    queryKey: npmRemotesQueryKey(params),
    queryFn: () => listNpmRemotes(params),
    placeholderData: (previous) => previous,
  });
}
