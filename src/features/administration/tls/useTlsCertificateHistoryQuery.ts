import { useQuery } from "@tanstack/react-query";

import { listTlsCertificateHistory } from "../../../api/client/pulpitCore/tls";
import { tlsCertificateHistoryKey } from "./queryKeys";

export function useTlsCertificateHistoryQuery() {
  return useQuery({
    queryKey: tlsCertificateHistoryKey,
    queryFn: () => listTlsCertificateHistory(),
  });
}
