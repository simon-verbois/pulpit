import { useQuery } from "@tanstack/react-query";

import { getFileRepositoryByName } from "../../../api/client/file/repositories";
import { fileRepositoryByNameKey } from "./queryKeys";

export function useFileRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: fileRepositoryByNameKey(name),
    queryFn: () => getFileRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
