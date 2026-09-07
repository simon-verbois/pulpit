import { useQuery } from "@tanstack/react-query";

import { getRpmRepositoryByName } from "../../../api/client/rpm/repositories";
import { rpmRepositoryByNameKey } from "./queryKeys";

export function useRpmRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: rpmRepositoryByNameKey(name),
    queryFn: () => getRpmRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
