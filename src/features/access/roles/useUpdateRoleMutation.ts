import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateRole } from "../../../api/client/access/roles";
import type { RoleUpdate } from "../../../api/client/access/types";
import { rolesListRootKey } from "./queryKeys";

interface UpdateArgs {
  href: string;
  data: RoleUpdate;
}

/** VERIFIED live: synchronous (200) - no task. Only ever called on an
 * unlocked (custom) role; a locked one 403s ("The role is locked.") - the
 * UI disables Edit/Delete for locked roles rather than surfacing that. */
export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ href, data }: UpdateArgs) => updateRole(href, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesListRootKey });
    },
  });
}
