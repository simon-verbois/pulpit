import { useQuery } from "@tanstack/react-query";

import { getPythonRepositoryByName } from "../../../api/client/python/repositories";
import { pythonRepositoryByNameKey } from "./queryKeys";

export function usePythonRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: pythonRepositoryByNameKey(name),
    queryFn: () => getPythonRepositoryByName(name),
  });
}
