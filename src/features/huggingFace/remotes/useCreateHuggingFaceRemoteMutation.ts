import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createHuggingFaceRemote } from "../../../api/client/hugging_face/remotes";
import type { HuggingFaceRemoteCreate } from "../../../api/client/hugging_face/types";
import { huggingFaceRemotesListRootKey } from "./queryKeys";

export function useCreateHuggingFaceRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: HuggingFaceRemoteCreate) => createHuggingFaceRemote(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - the new remote is
      // immediately visible, just refresh the list to show it.
      queryClient.invalidateQueries({ queryKey: huggingFaceRemotesListRootKey });
    },
  });
}
