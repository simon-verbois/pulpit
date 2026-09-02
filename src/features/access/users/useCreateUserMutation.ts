import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUser } from "../../../api/client/access/users";
import type { UserCreate } from "../../../api/client/access/types";
import { usersListRootKey } from "./queryKeys";

/** Synchronous (VERIFIED live: 201, no task) - the whole Access domain
 * never uses tasks, unlike RPM/Ansible/Container. */
export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserCreate) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersListRootKey });
    },
  });
}
