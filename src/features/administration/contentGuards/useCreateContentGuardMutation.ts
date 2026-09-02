import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createContentGuardByKind } from "../../../api/client/administration/contentGuards";
import type { ContentGuardKind } from "../../../api/client/administration/types";
import { contentGuardsListRootKey } from "./queryKeys";

/** Synchronous (VERIFIED live: 201, no task) for every flavor. */
export function useCreateContentGuardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      kind,
      data,
    }: {
      kind: ContentGuardKind;
      data: Record<string, unknown>;
    }) => createContentGuardByKind(kind, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentGuardsListRootKey });
    },
  });
}
