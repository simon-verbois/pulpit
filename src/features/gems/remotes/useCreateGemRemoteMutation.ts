import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createGemRemote } from "../../../api/client/gem/remotes";
import type { GemRemoteCreate } from "../../../api/client/gem/types";
import { gemRemotesListRootKey } from "./queryKeys";

export function useCreateGemRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GemRemoteCreate) => createGemRemote(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - the new remote is
      // immediately visible, just refresh the list to show it.
      queryClient.invalidateQueries({ queryKey: gemRemotesListRootKey });
    },
  });
}
