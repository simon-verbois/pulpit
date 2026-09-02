import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteContentGuard } from "../../../api/client/administration/contentGuards";
import { contentGuardsListRootKey } from "./queryKeys";

/** Synchronous (VERIFIED live: 204, no task) - works regardless of flavor. */
export function useDeleteContentGuardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ href }: { href: string; name: string }) => deleteContentGuard(href),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentGuardsListRootKey });
    },
  });
}
