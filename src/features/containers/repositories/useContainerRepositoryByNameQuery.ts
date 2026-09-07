import { useQuery } from "@tanstack/react-query";

import { getContainerRepositoryByName } from "../../../api/client/container/repositories";
import { containerRepositoryByNameKey } from "./queryKeys";

export function useContainerRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: containerRepositoryByNameKey(name),
    queryFn: () => getContainerRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
