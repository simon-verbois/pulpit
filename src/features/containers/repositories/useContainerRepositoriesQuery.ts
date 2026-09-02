import { useQuery } from "@tanstack/react-query";

import {
  listContainerRepositories,
  type ListContainerRepositoriesParams,
} from "../../../api/client/container/repositories";
import { containerRepositoriesQueryKey } from "./queryKeys";

export function useContainerRepositoriesQuery(params: ListContainerRepositoriesParams) {
  return useQuery({
    queryKey: containerRepositoriesQueryKey(params),
    queryFn: () => listContainerRepositories(params),
    placeholderData: (previous) => previous,
  });
}
