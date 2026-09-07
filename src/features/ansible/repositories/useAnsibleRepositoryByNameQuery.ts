import { useQuery } from "@tanstack/react-query";

import { getAnsibleRepositoryByName } from "../../../api/client/ansible/repositories";
import { ansibleRepositoryByNameKey } from "./queryKeys";

export function useAnsibleRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: ansibleRepositoryByNameKey(name),
    queryFn: () => getAnsibleRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
