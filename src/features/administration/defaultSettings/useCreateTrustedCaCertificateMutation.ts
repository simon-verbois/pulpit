import { useMutation } from "@tanstack/react-query";

import { createTrustedCaCertificate } from "../../../api/client/pulpitCore/trustedCa";

/** Returns a queued Job (task section 12: never applies inline) - callers
 * track it with useJob and refetch the certificate list once it succeeds
 * (see TrustedCaCertificatesSection). */
export function useCreateTrustedCaCertificateMutation() {
  return useMutation({
    mutationFn: createTrustedCaCertificate,
  });
}
