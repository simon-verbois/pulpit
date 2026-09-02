import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRole } from "../../../api/client/access/roles";
import type { RoleCreate } from "../../../api/client/access/types";
import { rolesListRootKey } from "./queryKeys";

/** Synchronous (VERIFIED live: 201, no task). */
export function useCreateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoleCreate) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesListRootKey });
    },
  });
}
