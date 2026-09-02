import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteGroup } from "../../../api/client/access/groups";
import { groupsListRootKey } from "./queryKeys";

/** VERIFIED live: synchronous (204) - no task. */
export function useDeleteGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteGroup(href),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsListRootKey });
    },
  });
}
