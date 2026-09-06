import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPythonRemote } from "../../../api/client/python/remotes";
import type { PythonRemoteCreate } from "../../../api/client/python/types";
import { pythonRemotesListRootKey } from "./queryKeys";

export function useCreatePythonRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PythonRemoteCreate) => createPythonRemote(data),
    onSuccess: () => {
      // Synchronous create (VERIFIED: 201, no task) - the new remote is
      // immediately visible, just refresh the list to show it.
      queryClient.invalidateQueries({ queryKey: pythonRemotesListRootKey });
    },
  });
}
