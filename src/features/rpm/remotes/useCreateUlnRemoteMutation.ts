import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createRpmUlnRemote } from "../../../api/client/rpm/ulnRemotes";
import type { RpmUlnRemoteCreate } from "../../../api/client/rpm/types";
import { rpmUlnRemotesListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task), same as a standard remote. */
export function useCreateUlnRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RpmUlnRemoteCreate) => createRpmUlnRemote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rpmUlnRemotesListRootKey });
    },
  });
}
