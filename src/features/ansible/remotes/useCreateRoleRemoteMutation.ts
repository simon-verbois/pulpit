import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRoleRemote } from "../../../api/client/ansible/roleRemotes";
import type { RoleRemoteCreate } from "../../../api/client/ansible/types";
import { roleRemotesListRootKey } from "./queryKeys";

export function useCreateRoleRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoleRemoteCreate) => createRoleRemote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleRemotesListRootKey });
    },
  });
}
