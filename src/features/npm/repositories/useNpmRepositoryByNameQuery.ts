import { useQuery } from "@tanstack/react-query";

import { getNpmRepositoryByName } from "../../../api/client/npm/repositories";
import { npmRepositoryByNameKey } from "./queryKeys";

export function useNpmRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: npmRepositoryByNameKey(name),
    queryFn: () => getNpmRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
