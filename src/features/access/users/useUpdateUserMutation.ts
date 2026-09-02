import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateUser } from "../../../api/client/access/users";
import type { UserUpdate } from "../../../api/client/access/types";
import { userByUsernameKey, usersListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  username: string;
  data: UserUpdate;
}

/** VERIFIED live: synchronous (200), unlike RPM/Ansible/Container's
 * asynchronous repository/remote updates - no task to register here. */
export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateUser(href, data),
    onSuccess: (_user, { username, data }) => {
      queryClient.invalidateQueries({ queryKey: userByUsernameKey(username) });
      if (data.username && data.username !== username) {
        queryClient.invalidateQueries({ queryKey: userByUsernameKey(data.username) });
      }
      queryClient.invalidateQueries({ queryKey: usersListRootKey });
    },
  });
}
