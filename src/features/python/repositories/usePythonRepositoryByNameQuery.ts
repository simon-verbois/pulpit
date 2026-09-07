import { useQuery } from "@tanstack/react-query";

import { getPythonRepositoryByName } from "../../../api/client/python/repositories";
import { pythonRepositoryByNameKey } from "./queryKeys";

export function usePythonRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: pythonRepositoryByNameKey(name),
    queryFn: () => getPythonRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
