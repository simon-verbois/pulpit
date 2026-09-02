import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createAnsibleRepository } from "../../../api/client/ansible/repositories";
import type { AnsibleRepositoryCreate } from "../../../api/client/ansible/types";
import { ansibleRepositoriesListRootKey } from "./queryKeys";

export function useCreateAnsibleRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AnsibleRepositoryCreate) => createAnsibleRepository(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - refresh the list to
      // show the new repository immediately.
      queryClient.invalidateQueries({ queryKey: ansibleRepositoriesListRootKey });
    },
  });
}
