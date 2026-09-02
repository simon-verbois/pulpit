import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addGroupUser, removeGroupUser } from "../../../api/client/access/groups";
import { groupUsersKey } from "./queryKeys";

interface AddArgs {
  groupHref: string;
  username: string;
}

/** Synchronous (VERIFIED live: 201) - no task. */
export function useAddGroupUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupHref, username }: AddArgs) => addGroupUser(groupHref, username),
    onSuccess: (_member, { groupHref }) => {
      queryClient.invalidateQueries({ queryKey: groupUsersKey(groupHref) });
    },
  });
}

interface RemoveArgs {
  groupHref: string;
  userId: number;
}

/** Synchronous (VERIFIED live: 204) - no task. Addressed by the user's
 * numeric id under the group's own `users/` sub-collection (VERIFIED live:
 * not the username - see src/api/client/access/groups.ts's removeGroupUser
 * doc comment). */
export function useRemoveGroupUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupHref, userId }: RemoveArgs) => removeGroupUser(groupHref, userId),
    onSuccess: (_void, { groupHref }) => {
      queryClient.invalidateQueries({ queryKey: groupUsersKey(groupHref) });
    },
  });
}
