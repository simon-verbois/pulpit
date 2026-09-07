import { useQuery } from "@tanstack/react-query";

import { getActiveTlsCertificate } from "../../../api/client/pulpitCore/tls";
import { tlsActiveCertificateKey } from "./queryKeys";

export function useActiveTlsCertificateQuery() {
  return useQuery({
    queryKey: tlsActiveCertificateKey,
    queryFn: () => getActiveTlsCertificate(),
    // Auto-renewal (tls.renewal_check, daily) runs server-side with nothing
    // in the browser to invalidate this query when it fires - poll so the
    // page picks up a background renewal on its own, same reasoning as
    // repositorySigning/useSigningKeysQuery.ts.
    refetchInterval: 30000,
  });
}
