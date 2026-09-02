import { useQuery } from "@tanstack/react-query";

import { listGroupUsers } from "../../../api/client/access/groups";
import { groupUsersKey } from "./queryKeys";

export function useGroupUsersQuery(
  groupHref: string,
  params: { limit: number; offset: number },
) {
  return useQuery({
    queryKey: groupUsersKey(groupHref, params),
    queryFn: () => listGroupUsers(groupHref, params),
    placeholderData: (previous) => previous,
  });
}
