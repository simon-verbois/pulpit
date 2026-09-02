import { useQuery } from "@tanstack/react-query";

import {
  listContainerRemotes,
  type ListContainerRemotesParams,
} from "../../../api/client/container/remotes";
import { containerRemotesQueryKey } from "./queryKeys";

export function useContainerRemotesQuery(params: ListContainerRemotesParams) {
  return useQuery({
    queryKey: containerRemotesQueryKey(params),
    queryFn: () => listContainerRemotes(params),
    placeholderData: (previous) => previous,
  });
}
