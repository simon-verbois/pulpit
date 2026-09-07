import { useMutation, useQueryClient } from "@tanstack/react-query";

import { requestFreeIpaCertificate } from "../../../api/client/pulpitCore/tls";
import { tlsActiveCertificateKey, tlsCertificateHistoryKey } from "./queryKeys";

export function useRequestFreeIpaCertificateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestFreeIpaCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tlsActiveCertificateKey });
      queryClient.invalidateQueries({ queryKey: tlsCertificateHistoryKey });
    },
  });
}
