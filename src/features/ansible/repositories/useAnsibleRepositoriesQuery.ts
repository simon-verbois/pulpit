import { useQuery } from "@tanstack/react-query";

import {
  listAnsibleRepositories,
  type ListAnsibleRepositoriesParams,
} from "../../../api/client/ansible/repositories";
import { ansibleRepositoriesQueryKey } from "./queryKeys";

export function useAnsibleRepositoriesQuery(params: ListAnsibleRepositoriesParams) {
  return useQuery({
    queryKey: ansibleRepositoriesQueryKey(params),
    queryFn: () => listAnsibleRepositories(params),
    placeholderData: (previous) => previous,
  });
}
