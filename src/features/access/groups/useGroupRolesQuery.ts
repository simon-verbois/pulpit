import { useQuery } from "@tanstack/react-query";

import { listGroupRoles } from "../../../api/client/access/groups";
import { groupRolesKey } from "./queryKeys";

export function useGroupRolesQuery(
  groupHref: string,
  params: { limit: number; offset: number },
) {
  return useQuery({
    queryKey: groupRolesKey(groupHref, params),
    queryFn: () => listGroupRoles(groupHref, params),
    placeholderData: (previous) => previous,
  });
}
