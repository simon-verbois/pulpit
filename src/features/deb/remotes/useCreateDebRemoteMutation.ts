import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createDebRemote } from "../../../api/client/deb/remotes";
import type { DebRemoteCreate } from "../../../api/client/deb/types";
import { debRemotesListRootKey } from "./queryKeys";

export function useCreateDebRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DebRemoteCreate) => createDebRemote(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - the new remote is
      // immediately visible, just refresh the list to show it.
      queryClient.invalidateQueries({ queryKey: debRemotesListRootKey });
    },
  });
}
