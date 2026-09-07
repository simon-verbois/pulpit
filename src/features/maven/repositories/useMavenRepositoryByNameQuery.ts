import { useQuery } from "@tanstack/react-query";

import { getMavenRepositoryByName } from "../../../api/client/maven/repositories";
import { mavenRepositoryByNameKey } from "./queryKeys";

export function useMavenRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: mavenRepositoryByNameKey(name),
    queryFn: () => getMavenRepositoryByName(name),
    // Maven is pull-through-cache only (no sync action at all) - a new
    // version can appear purely from a client requesting an artifact, with
    // nothing in this browser to invalidate the query. Poll so it shows up
    // without F5.
    refetchInterval: 15000,
  });
}
