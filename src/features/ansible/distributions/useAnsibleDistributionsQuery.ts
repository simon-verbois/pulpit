import { useQuery } from "@tanstack/react-query";

import {
  listAnsibleDistributions,
  type ListAnsibleDistributionsParams,
} from "../../../api/client/ansible/distributions";
import { ansibleDistributionsQueryKey } from "./queryKeys";

export function useAnsibleDistributionsQuery(params: ListAnsibleDistributionsParams) {
  return useQuery({
    queryKey: ansibleDistributionsQueryKey(params),
    queryFn: () => listAnsibleDistributions(params),
    placeholderData: (previous) => previous,
  });
}
