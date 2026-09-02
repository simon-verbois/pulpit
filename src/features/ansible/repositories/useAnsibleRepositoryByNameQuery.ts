import { useQuery } from "@tanstack/react-query";

import { getAnsibleRepositoryByName } from "../../../api/client/ansible/repositories";
import { ansibleRepositoryByNameKey } from "./queryKeys";

export function useAnsibleRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: ansibleRepositoryByNameKey(name),
    queryFn: () => getAnsibleRepositoryByName(name),
  });
}
