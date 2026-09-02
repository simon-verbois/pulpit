import { useQuery } from "@tanstack/react-query";

import { getRpmRepositoryByName } from "../../../api/client/rpm/repositories";
import { rpmRepositoryByNameKey } from "./queryKeys";

export function useRpmRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: rpmRepositoryByNameKey(name),
    queryFn: () => getRpmRepositoryByName(name),
  });
}
