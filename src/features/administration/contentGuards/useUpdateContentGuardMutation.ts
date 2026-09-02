import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateContentGuardByKind } from "../../../api/client/administration/contentGuards";
import { contentGuardDetailKey, contentGuardsListRootKey } from "./queryKeys";

/** Synchronous (VERIFIED live: 200, no task) for every flavor. */
export function useUpdateContentGuardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ href, data }: { href: string; data: Record<string, unknown> }) =>
      updateContentGuardByKind(href, data),
    onSuccess: (_result, { href }) => {
      queryClient.invalidateQueries({ queryKey: contentGuardsListRootKey });
      queryClient.invalidateQueries({ queryKey: contentGuardDetailKey(href) });
    },
  });
}
