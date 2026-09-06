import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createDebRepository } from "../../../api/client/deb/repositories";
import type { DebRepositoryCreate } from "../../../api/client/deb/types";
import { debRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateDebRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DebRepositoryCreate) => createDebRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debRepositoriesListRootKey });
    },
  });
}
