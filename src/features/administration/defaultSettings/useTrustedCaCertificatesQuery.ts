import { useQuery } from "@tanstack/react-query";

import { listTrustedCaCertificates } from "../../../api/client/pulpitCore/trustedCa";
import { trustedCaCertificatesKey } from "./queryKeys";

export function useTrustedCaCertificatesQuery() {
  return useQuery({
    queryKey: trustedCaCertificatesKey,
    queryFn: listTrustedCaCertificates,
  });
}
