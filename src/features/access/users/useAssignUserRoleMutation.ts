import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignUserRole, unassignUserRole } from "../../../api/client/access/users";
import type { RoleAssignmentCreate } from "../../../api/client/access/types";
import { userRolesKey } from "./queryKeys";

interface AssignArgs {
  userHref: string;
  data: RoleAssignmentCreate;
}

/** Synchronous (VERIFIED live: 201) - no task. */
export function useAssignUserRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userHref, data }: AssignArgs) => assignUserRole(userHref, data),
    onSuccess: (_role, { userHref }) => {
      queryClient.invalidateQueries({ queryKey: userRolesKey(userHref) });
    },
  });
}

interface UnassignArgs {
  userHref: string;
  roleAssignmentHref: string;
}

/** Synchronous (VERIFIED live: 204) - no task. */
export function useUnassignUserRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleAssignmentHref }: UnassignArgs) =>
      unassignUserRole(roleAssignmentHref),
    onSuccess: (_void, { userHref }) => {
      queryClient.invalidateQueries({ queryKey: userRolesKey(userHref) });
    },
  });
}
