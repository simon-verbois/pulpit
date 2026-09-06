import { useQuery } from "@tanstack/react-query";

import {
  listPythonDistributions,
  type ListPythonDistributionsParams,
} from "../../../api/client/python/distributions";
import { pythonDistributionsQueryKey } from "./queryKeys";

export function usePythonDistributionsQuery(params: ListPythonDistributionsParams) {
  return useQuery({
    queryKey: pythonDistributionsQueryKey(params),
    queryFn: () => listPythonDistributions(params),
    placeholderData: (previous) => previous,
  });
}
