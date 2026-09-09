import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addGroupUser, removeGroupUser } from "../../../api/client/access/groups";
import { groupUsersKey } from "./queryKeys";

interface AddArgs {
  groupHref: string;
  usernames: string[];
}

/** Each add is synchronous (VERIFIED live: 201) - no task. The UI batches
 * independent calls so several selected users can be added in one action. */
export function useAddGroupUsersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupHref, usernames }: AddArgs) =>
      Promise.all(usernames.map((username) => addGroupUser(groupHref, username))),
    onSettled: (_members, _error, { groupHref }) => {
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
