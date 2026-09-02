import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addObjectRole, removeObjectRole } from "../../api/client/access/objectRoles";
import type { ObjectRoleChange } from "../../api/client/access/types";
import { objectRolesKey } from "./useObjectRolesQuery";

interface Args {
  objectHref: string;
  data: ObjectRoleChange;
}

/** Synchronous (VERIFIED live: 201) - no task. */
export function useAddObjectRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ objectHref, data }: Args) => addObjectRole(objectHref, data),
    onSuccess: (_result, { objectHref }) => {
      queryClient.invalidateQueries({ queryKey: objectRolesKey(objectHref) });
    },
  });
}

/** Synchronous (VERIFIED live: 201) - no task. */
export function useRemoveObjectRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ objectHref, data }: Args) => removeObjectRole(objectHref, data),
    onSuccess: (_result, { objectHref }) => {
      queryClient.invalidateQueries({ queryKey: objectRolesKey(objectHref) });
    },
  });
}
