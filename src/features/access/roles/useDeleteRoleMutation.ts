import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteRole } from "../../../api/client/access/roles";
import { rolesListRootKey } from "./queryKeys";

/** VERIFIED live: synchronous (204) - no task. */
export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteRole(href),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesListRootKey });
    },
  });
}
