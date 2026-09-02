import { useQuery } from "@tanstack/react-query";

import {
  listRoleRemotes,
  type ListRoleRemotesParams,
} from "../../../api/client/ansible/roleRemotes";
import { roleRemotesQueryKey } from "./queryKeys";

export function useRoleRemotesQuery(params: ListRoleRemotesParams) {
  return useQuery({
    queryKey: roleRemotesQueryKey(params),
    queryFn: () => listRoleRemotes(params),
    placeholderData: (previous) => previous,
  });
}
