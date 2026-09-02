import { useQuery } from "@tanstack/react-query";

import {
  listAnsibleRoles,
  type ListAnsibleRolesParams,
} from "../../../api/client/ansible/roles";
import { ansibleRolesQueryKey } from "./queryKeys";

export function useAnsibleRolesQuery(params: ListAnsibleRolesParams) {
  return useQuery({
    queryKey: ansibleRolesQueryKey(params),
    queryFn: () => listAnsibleRoles(params),
    placeholderData: (previous) => previous,
  });
}
