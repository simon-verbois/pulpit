import { useQuery } from "@tanstack/react-query";

import {
  listMavenRepositories,
  type ListMavenRepositoriesParams,
} from "../../../api/client/maven/repositories";
import { mavenRepositoriesQueryKey } from "./queryKeys";

export function useMavenRepositoriesQuery(params: ListMavenRepositoriesParams) {
  return useQuery({
    queryKey: mavenRepositoriesQueryKey(params),
    queryFn: () => listMavenRepositories(params),
    placeholderData: (previous) => previous,
  });
}
