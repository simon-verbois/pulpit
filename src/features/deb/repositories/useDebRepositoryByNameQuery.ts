import { useQuery } from "@tanstack/react-query";

import { getDebRepositoryByName } from "../../../api/client/deb/repositories";
import { debRepositoryByNameKey } from "./queryKeys";

export function useDebRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: debRepositoryByNameKey(name),
    queryFn: () => getDebRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
