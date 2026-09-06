import { useQuery } from "@tanstack/react-query";

import {
  listPythonRepositories,
  type ListPythonRepositoriesParams,
} from "../../../api/client/python/repositories";
import { pythonRepositoriesQueryKey } from "./queryKeys";

export function usePythonRepositoriesQuery(params: ListPythonRepositoriesParams) {
  return useQuery({
    queryKey: pythonRepositoriesQueryKey(params),
    queryFn: () => listPythonRepositories(params),
    placeholderData: (previous) => previous,
  });
}
