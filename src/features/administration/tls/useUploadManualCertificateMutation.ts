import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadManualTlsCertificate } from "../../../api/client/pulpitCore/tls";
import { tlsActiveCertificateKey, tlsCertificateHistoryKey } from "./queryKeys";

export function useUploadManualCertificateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadManualTlsCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tlsActiveCertificateKey });
      queryClient.invalidateQueries({ queryKey: tlsCertificateHistoryKey });
    },
  });
}
