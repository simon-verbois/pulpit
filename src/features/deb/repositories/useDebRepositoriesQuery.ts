import { useQuery } from "@tanstack/react-query";

import {
  listDebRepositories,
  type ListDebRepositoriesParams,
} from "../../../api/client/deb/repositories";
import { debRepositoriesQueryKey } from "./queryKeys";

export function useDebRepositoriesQuery(params: ListDebRepositoriesParams) {
  return useQuery({
    queryKey: debRepositoriesQueryKey(params),
    queryFn: () => listDebRepositories(params),
    placeholderData: (previous) => previous,
  });
}
