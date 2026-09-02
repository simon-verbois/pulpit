import { useQuery } from "@tanstack/react-query";

import { listUserRoles } from "../../../api/client/access/users";
import { userRolesKey } from "./queryKeys";

export function useUserRolesQuery(
  userHref: string,
  params: { limit: number; offset: number },
) {
  return useQuery({
    queryKey: userRolesKey(userHref, params),
    queryFn: () => listUserRoles(userHref, params),
    placeholderData: (previous) => previous,
  });
}
