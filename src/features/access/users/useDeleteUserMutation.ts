import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteUser } from "../../../api/client/access/users";
import { usersListRootKey } from "./queryKeys";

/** VERIFIED live: synchronous (204) - no task to register. */
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ href }: { href: string; username: string }) => deleteUser(href),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersListRootKey });
    },
  });
}
