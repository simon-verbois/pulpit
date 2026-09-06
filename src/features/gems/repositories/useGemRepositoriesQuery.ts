import { useQuery } from "@tanstack/react-query";

import {
  listGemRepositories,
  type ListGemRepositoriesParams,
} from "../../../api/client/gem/repositories";
import { gemRepositoriesQueryKey } from "./queryKeys";

export function useGemRepositoriesQuery(params: ListGemRepositoriesParams) {
  return useQuery({
    queryKey: gemRepositoriesQueryKey(params),
    queryFn: () => listGemRepositories(params),
    placeholderData: (previous) => previous,
  });
}
