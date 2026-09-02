import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCollectionRemote } from "../../../api/client/ansible/collectionRemotes";
import type { CollectionRemoteCreate } from "../../../api/client/ansible/types";
import { collectionRemotesListRootKey } from "./queryKeys";

export function useCreateCollectionRemoteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CollectionRemoteCreate) => createCollectionRemote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionRemotesListRootKey });
    },
  });
}
