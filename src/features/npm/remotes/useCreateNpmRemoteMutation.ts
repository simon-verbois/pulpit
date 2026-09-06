import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createNpmRemote } from "../../../api/client/npm/remotes";
import type { NpmRemoteCreate } from "../../../api/client/npm/types";
import { npmRemotesListRootKey } from "./queryKeys";

export function useCreateNpmRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NpmRemoteCreate) => createNpmRemote(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - the new remote is
      // immediately visible, just refresh the list to show it.
      queryClient.invalidateQueries({ queryKey: npmRemotesListRootKey });
    },
  });
}
