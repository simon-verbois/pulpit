import { useQuery } from "@tanstack/react-query";

import { getMavenRepositoryByName } from "../../../api/client/maven/repositories";
import { mavenRepositoryByNameKey } from "./queryKeys";

export function useMavenRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: mavenRepositoryByNameKey(name),
    queryFn: () => getMavenRepositoryByName(name),
  });
}
