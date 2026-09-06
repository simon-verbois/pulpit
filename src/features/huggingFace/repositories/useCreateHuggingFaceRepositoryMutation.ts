import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createHuggingFaceRepository } from "../../../api/client/hugging_face/repositories";
import type { HuggingFaceRepositoryCreate } from "../../../api/client/hugging_face/types";
import { huggingFaceRepositoriesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateHuggingFaceRepositoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: HuggingFaceRepositoryCreate) => createHuggingFaceRepository(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: huggingFaceRepositoriesListRootKey });
    },
  });
}
