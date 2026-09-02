import { useQuery } from "@tanstack/react-query";

import {
  listGitRemotes,
  type ListGitRemotesParams,
} from "../../../api/client/ansible/gitRemotes";
import { gitRemotesQueryKey } from "./queryKeys";

export function useGitRemotesQuery(params: ListGitRemotesParams) {
  return useQuery({
    queryKey: gitRemotesQueryKey(params),
    queryFn: () => listGitRemotes(params),
    placeholderData: (previous) => previous,
  });
}
