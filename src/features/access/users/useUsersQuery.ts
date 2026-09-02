import { useQuery } from "@tanstack/react-query";

import { listUsers, type ListUsersParams } from "../../../api/client/access/users";
import { usersQueryKey } from "./queryKeys";

export function useUsersQuery(params: ListUsersParams) {
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: () => listUsers(params),
    placeholderData: (previous) => previous,
  });
}
