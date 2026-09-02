import { useMutation, useQueryClient } from "@tanstack/react-query";

import { extendSigningKeyExpiration } from "../../../api/client/pulpitCore/signing";
import { signingKeysListKey } from "./queryKeys";

export function useExtendSigningKeyExpirationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ keyId, additionalDays }: { keyId: string; additionalDays: number }) =>
      extendSigningKeyExpiration(keyId, additionalDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signingKeysListKey });
    },
  });
}
