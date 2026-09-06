import { useQuery } from "@tanstack/react-query";

import { listGemRemotes, type ListGemRemotesParams } from "../../../api/client/gem/remotes";
import { gemRemotesQueryKey } from "./queryKeys";

export function useGemRemotesQuery(params: ListGemRemotesParams) {
  return useQuery({
    queryKey: gemRemotesQueryKey(params),
    queryFn: () => listGemRemotes(params),
    placeholderData: (previous) => previous,
  });
}
