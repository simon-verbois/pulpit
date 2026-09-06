import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createFileGitRemote } from "../../../api/client/file/gitRemotes";
import type { FileGitRemoteCreate } from "../../../api/client/file/types";
import { fileGitRemotesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task), same as a standard remote. */
export function useCreateFileGitRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FileGitRemoteCreate) => createFileGitRemote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileGitRemotesListRootKey });
    },
  });
}
