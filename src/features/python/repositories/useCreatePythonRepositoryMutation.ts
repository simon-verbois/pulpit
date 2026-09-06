import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPythonRepository } from "../../../api/client/python/repositories";
import type { PythonRepositoryCreate } from "../../../api/client/python/types";
import { pythonRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreatePythonRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PythonRepositoryCreate) => createPythonRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pythonRepositoriesListRootKey });
    },
  });
}
