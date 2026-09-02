import { useQuery } from "@tanstack/react-query";

import { getContainerRepositoryByName } from "../../../api/client/container/repositories";
import { containerRepositoryByNameKey } from "./queryKeys";

export function useContainerRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: containerRepositoryByNameKey(name),
    queryFn: () => getContainerRepositoryByName(name),
  });
}
