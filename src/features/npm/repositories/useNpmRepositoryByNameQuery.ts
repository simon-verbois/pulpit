import { useQuery } from "@tanstack/react-query";

import { getNpmRepositoryByName } from "../../../api/client/npm/repositories";
import { npmRepositoryByNameKey } from "./queryKeys";

export function useNpmRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: npmRepositoryByNameKey(name),
    queryFn: () => getNpmRepositoryByName(name),
  });
}
