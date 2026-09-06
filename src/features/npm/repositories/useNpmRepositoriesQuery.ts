import { useQuery } from "@tanstack/react-query";

import {
  listNpmRepositories,
  type ListNpmRepositoriesParams,
} from "../../../api/client/npm/repositories";
import { npmRepositoriesQueryKey } from "./queryKeys";

export function useNpmRepositoriesQuery(params: ListNpmRepositoriesParams) {
  return useQuery({
    queryKey: npmRepositoriesQueryKey(params),
    queryFn: () => listNpmRepositories(params),
    placeholderData: (previous) => previous,
  });
}
