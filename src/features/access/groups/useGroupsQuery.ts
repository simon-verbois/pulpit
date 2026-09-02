import { useQuery } from "@tanstack/react-query";

import { listGroups, type ListGroupsParams } from "../../../api/client/access/groups";
import { groupsQueryKey } from "./queryKeys";

export function useGroupsQuery(params: ListGroupsParams) {
  return useQuery({
    queryKey: groupsQueryKey(params),
    queryFn: () => listGroups(params),
    placeholderData: (previous) => previous,
  });
}
