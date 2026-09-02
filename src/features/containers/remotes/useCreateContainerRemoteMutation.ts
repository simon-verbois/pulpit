import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createContainerRemote } from "../../../api/client/container/remotes";
import type { ContainerRemoteCreate } from "../../../api/client/container/types";
import { containerRemotesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateContainerRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContainerRemoteCreate) => createContainerRemote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: containerRemotesListRootKey });
    },
  });
}
