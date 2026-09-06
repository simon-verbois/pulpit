import { useQuery } from "@tanstack/react-query";

import {
  listFileGitRemotes,
  type ListFileGitRemotesParams,
} from "../../../api/client/file/gitRemotes";
import { fileGitRemotesQueryKey } from "./queryKeys";

export function useFileGitRemotesQuery(params: ListFileGitRemotesParams) {
  return useQuery({
    queryKey: fileGitRemotesQueryKey(params),
    queryFn: () => listFileGitRemotes(params),
    placeholderData: (previous) => previous,
  });
}
