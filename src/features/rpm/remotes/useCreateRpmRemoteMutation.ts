import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRpmRemote } from "../../../api/client/rpm/remotes";
import type { RpmRemoteCreate } from "../../../api/client/rpm/types";
import { rpmRemotesListRootKey } from "./queryKeys";

export function useCreateRpmRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RpmRemoteCreate) => createRpmRemote(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - the new remote is
      // immediately visible, just refresh the list to show it.
      queryClient.invalidateQueries({ queryKey: rpmRemotesListRootKey });
    },
  });
}
