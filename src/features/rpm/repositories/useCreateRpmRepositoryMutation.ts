import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRpmRepository } from "../../../api/client/rpm/repositories";
import type { RpmRepositoryCreate } from "../../../api/client/rpm/types";
import { rpmRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateRpmRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RpmRepositoryCreate) => createRpmRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rpmRepositoriesListRootKey });
    },
  });
}
