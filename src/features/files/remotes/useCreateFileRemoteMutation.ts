import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createFileRemote } from "../../../api/client/file/remotes";
import type { FileRemoteCreate } from "../../../api/client/file/types";
import { fileRemotesListRootKey } from "./queryKeys";

export function useCreateFileRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FileRemoteCreate) => createFileRemote(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - the new remote is
      // immediately visible, just refresh the list to show it.
      queryClient.invalidateQueries({ queryKey: fileRemotesListRootKey });
    },
  });
}
