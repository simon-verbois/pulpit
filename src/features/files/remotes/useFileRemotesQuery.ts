import { useQuery } from "@tanstack/react-query";

import {
  listFileRemotes,
  type ListFileRemotesParams,
} from "../../../api/client/file/remotes";
import { fileRemotesQueryKey } from "./queryKeys";

export function useFileRemotesQuery(params: ListFileRemotesParams) {
  return useQuery({
    queryKey: fileRemotesQueryKey(params),
    queryFn: () => listFileRemotes(params),
    placeholderData: (previous) => previous,
  });
}
