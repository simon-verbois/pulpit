import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createMavenRemote } from "../../../api/client/maven/remotes";
import type { MavenRemoteCreate } from "../../../api/client/maven/types";
import { mavenRemotesListRootKey } from "./queryKeys";

export function useCreateMavenRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MavenRemoteCreate) => createMavenRemote(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - the new remote is
      // immediately visible, just refresh the list to show it.
      queryClient.invalidateQueries({ queryKey: mavenRemotesListRootKey });
    },
  });
}
