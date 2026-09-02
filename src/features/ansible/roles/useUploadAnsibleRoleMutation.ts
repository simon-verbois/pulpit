import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";

import { uploadAnsibleRole } from "../../../api/client/ansible/roles";

interface UploadArgs {
  file: File;
  name: string;
  namespace: string;
  version: string;
  repositoryHref: string;
  invalidateKeys: QueryKey[];
}

/** Synchronous (VERIFIED live schema: 201, no task) two-step upload
 * (artifact then content, see src/api/client/ansible/roles.ts) - the new
 * role is immediately visible, so this just invalidates on success rather
 * than registering a task. */
export function useUploadAnsibleRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, name, namespace, version, repositoryHref }: UploadArgs) =>
      uploadAnsibleRole(file, { name, namespace, version }, repositoryHref),
    onSuccess: (_role, { invalidateKeys }) => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
