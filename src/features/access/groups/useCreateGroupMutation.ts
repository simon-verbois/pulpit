import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createGroup } from "../../../api/client/access/groups";
import type { GroupCreate } from "../../../api/client/access/types";
import { groupsListRootKey } from "./queryKeys";

/** Synchronous (VERIFIED live: 201, no task). */
export function useCreateGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GroupCreate) => createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsListRootKey });
    },
  });
}
