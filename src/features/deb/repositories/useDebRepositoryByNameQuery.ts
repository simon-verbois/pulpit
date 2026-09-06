import { useQuery } from "@tanstack/react-query";

import { getDebRepositoryByName } from "../../../api/client/deb/repositories";
import { debRepositoryByNameKey } from "./queryKeys";

export function useDebRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: debRepositoryByNameKey(name),
    queryFn: () => getDebRepositoryByName(name),
  });
}
