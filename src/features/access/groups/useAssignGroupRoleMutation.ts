import { useMutation, useQueryClient } from "@tanstack/react-query";

import { assignGroupRole, unassignGroupRole } from "../../../api/client/access/groups";
import type { RoleAssignmentCreate } from "../../../api/client/access/types";
import { groupRolesKey } from "./queryKeys";

interface AssignArgs {
  groupHref: string;
  data: RoleAssignmentCreate;
}

/** Synchronous (VERIFIED live: 201) - no task. */
export function useAssignGroupRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupHref, data }: AssignArgs) => assignGroupRole(groupHref, data),
    onSuccess: (_role, { groupHref }) => {
      queryClient.invalidateQueries({ queryKey: groupRolesKey(groupHref) });
    },
  });
}

interface UnassignArgs {
  groupHref: string;
  roleAssignmentHref: string;
}

/** Synchronous (VERIFIED live: 204) - no task. */
export function useUnassignGroupRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleAssignmentHref }: UnassignArgs) =>
      unassignGroupRole(roleAssignmentHref),
    onSuccess: (_void, { groupHref }) => {
      queryClient.invalidateQueries({ queryKey: groupRolesKey(groupHref) });
    },
  });
}
