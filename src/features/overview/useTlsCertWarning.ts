import { useQuery } from "@tanstack/react-query";

import { getActiveTlsCertificate } from "../../api/client/pulpitCore/tls";
import { tlsActiveCertificateKey } from "../administration/tls/queryKeys";
import type { Warning } from "../../lib/warnings";

/** Feeds the Overview page's warnings card from the exact same
 * GET /api/v1/tls/active response the Administration > TLS tab itself
 * reads (tlsActiveCertificateKey) - the expiry threshold (warn_days) is
 * never hardcoded twice. */
export function useTlsCertWarning(): Warning[] {
  const query = useQuery({
    queryKey: tlsActiveCertificateKey,
    queryFn: () => getActiveTlsCertificate(),
    refetchInterval: 30000,
  });

  if (!query.data?.is_expiring_soon) {
    return [];
  }
  return [
    {
      id: "tls-certificate-expiring",
      variant: "warning",
      message: `The TLS certificate for port 8443 expires in ${query.data.days_until_expiry} day(s) - see Administration > TLS.`,
    },
  ];
}
