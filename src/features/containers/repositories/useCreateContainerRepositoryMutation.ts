import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createContainerRepository } from "../../../api/client/container/repositories";
import type { ContainerRepositoryCreate } from "../../../api/client/container/types";
import { containerRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateContainerRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContainerRepositoryCreate) => createContainerRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: containerRepositoriesListRootKey });
    },
  });
}
