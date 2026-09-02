import { useQuery } from "@tanstack/react-query";

import { listRoles, type ListRolesParams } from "../../../api/client/access/roles";
import { rolesQueryKey } from "./queryKeys";

export function useRolesQuery(params: ListRolesParams) {
  return useQuery({
    queryKey: rolesQueryKey(params),
    queryFn: () => listRoles(params),
    placeholderData: (previous) => previous,
  });
}
