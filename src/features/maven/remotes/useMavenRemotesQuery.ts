import { useQuery } from "@tanstack/react-query";

import {
  listMavenRemotes,
  type ListMavenRemotesParams,
} from "../../../api/client/maven/remotes";
import { mavenRemotesQueryKey } from "./queryKeys";

export function useMavenRemotesQuery(params: ListMavenRemotesParams) {
  return useQuery({
    queryKey: mavenRemotesQueryKey(params),
    queryFn: () => listMavenRemotes(params),
    placeholderData: (previous) => previous,
  });
}
