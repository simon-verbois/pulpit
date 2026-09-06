import { useQuery } from "@tanstack/react-query";

import {
  listFileRepositories,
  type ListFileRepositoriesParams,
} from "../../../api/client/file/repositories";
import { fileRepositoriesQueryKey } from "./queryKeys";

export function useFileRepositoriesQuery(params: ListFileRepositoriesParams) {
  return useQuery({
    queryKey: fileRepositoriesQueryKey(params),
    queryFn: () => listFileRepositories(params),
    placeholderData: (previous) => previous,
  });
}
