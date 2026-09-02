import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createGitRemote } from "../../../api/client/ansible/gitRemotes";
import type { GitRemoteCreate } from "../../../api/client/ansible/types";
import { gitRemotesListRootKey } from "./queryKeys";

export function useCreateGitRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GitRemoteCreate) => createGitRemote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gitRemotesListRootKey });
    },
  });
}
