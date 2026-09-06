import { useQuery } from "@tanstack/react-query";

import { getGemRepositoryByName } from "../../../api/client/gem/repositories";
import { gemRepositoryByNameKey } from "./queryKeys";

export function useGemRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: gemRepositoryByNameKey(name),
    queryFn: () => getGemRepositoryByName(name),
  });
}
