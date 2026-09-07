import { useMutation, useQueryClient } from "@tanstack/react-query";

import { regenerateSelfSignedTlsCertificate } from "../../../api/client/pulpitCore/tls";
import { tlsActiveCertificateKey, tlsCertificateHistoryKey } from "./queryKeys";

export function useRegenerateSelfSignedCertificateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: regenerateSelfSignedTlsCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tlsActiveCertificateKey });
      queryClient.invalidateQueries({ queryKey: tlsCertificateHistoryKey });
    },
  });
}
