import { useMutation, useQueryClient } from "@tanstack/react-query";

import { generateSigningKey } from "../../../api/client/pulpitCore/signing";
import { signingKeysListKey } from "./queryKeys";

/** Returns a queued Job (task section 12: never signs/generates inline) -
 * callers track it with useJob and invalidate the keys list once it
 * succeeds (see RepositorySigningPage). */
export function useGenerateSigningKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateSigningKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: signingKeysListKey });
    },
  });
}
