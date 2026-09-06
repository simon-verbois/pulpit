import { useQuery } from "@tanstack/react-query";

import {
  listPythonRemotes,
  type ListPythonRemotesParams,
} from "../../../api/client/python/remotes";
import { pythonRemotesQueryKey } from "./queryKeys";

export function usePythonRemotesQuery(params: ListPythonRemotesParams) {
  return useQuery({
    queryKey: pythonRemotesQueryKey(params),
    queryFn: () => listPythonRemotes(params),
    placeholderData: (previous) => previous,
  });
}
