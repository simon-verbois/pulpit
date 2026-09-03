import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteTrustedCaCertificate } from "../../../api/client/pulpitCore/trustedCa";
import { trustedCaCertificatesKey } from "./queryKeys";

export function useDeleteTrustedCaCertificateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTrustedCaCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trustedCaCertificatesKey });
    },
  });
}
