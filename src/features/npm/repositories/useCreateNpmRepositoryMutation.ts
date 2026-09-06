import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createNpmRepository } from "../../../api/client/npm/repositories";
import type { NpmRepositoryCreate } from "../../../api/client/npm/types";
import { npmRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateNpmRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NpmRepositoryCreate) => createNpmRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: npmRepositoriesListRootKey });
    },
  });
}
