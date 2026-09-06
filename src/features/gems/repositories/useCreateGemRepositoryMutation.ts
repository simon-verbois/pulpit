import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createGemRepository } from "../../../api/client/gem/repositories";
import type { GemRepositoryCreate } from "../../../api/client/gem/types";
import { gemRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateGemRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GemRepositoryCreate) => createGemRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gemRepositoriesListRootKey });
    },
  });
}
