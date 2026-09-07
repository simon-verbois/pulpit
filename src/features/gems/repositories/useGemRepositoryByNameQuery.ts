import { useQuery } from "@tanstack/react-query";

import { getGemRepositoryByName } from "../../../api/client/gem/repositories";
import { gemRepositoryByNameKey } from "./queryKeys";

export function useGemRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: gemRepositoryByNameKey(name),
    queryFn: () => getGemRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
