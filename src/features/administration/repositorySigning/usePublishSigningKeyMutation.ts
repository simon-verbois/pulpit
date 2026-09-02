import { useMutation, useQueryClient } from "@tanstack/react-query";

import { publishSigningKey } from "../../../api/client/pulpitCore/signing";
import { signingKeysListKey } from "./queryKeys";

export function usePublishSigningKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keyId, reason }: { keyId: string; reason?: string }) =>
      publishSigningKey(keyId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signingKeysListKey });
    },
  });
}
