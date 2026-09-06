import { useQuery } from "@tanstack/react-query";

import {
  listPythonContent,
  type ListPythonContentParams,
} from "../../../api/client/python/content";

export function usePythonContentQuery(params: ListPythonContentParams) {
  return useQuery({
    queryKey: ["pulp", "python", "content", params],
    queryFn: () => listPythonContent(params),
    placeholderData: (previous) => previous,
  });
}
