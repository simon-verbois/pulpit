import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createFileRepository } from "../../../api/client/file/repositories";
import type { FileRepositoryCreate } from "../../../api/client/file/types";
import { fileRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateFileRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FileRepositoryCreate) => createFileRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileRepositoriesListRootKey });
    },
  });
}
