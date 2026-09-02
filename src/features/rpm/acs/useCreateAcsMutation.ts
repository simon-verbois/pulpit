import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createAlternateContentSource } from "../../../api/client/rpm/acs";
import type { RpmAlternateContentSourceCreate } from "../../../api/client/rpm/types";
import { acsListRootKey } from "./queryKeys";

/** Synchronous create (VERIFIED: 201, no task). */
export function useCreateAcsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RpmAlternateContentSourceCreate) =>
      createAlternateContentSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acsListRootKey });
    },
  });
}
