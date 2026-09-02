import { useQuery } from "@tanstack/react-query";

import {
  listSigningServices,
  type ListSigningServicesParams,
} from "../../../api/client/administration/signingServices";

export function useSigningServicesQuery(params: ListSigningServicesParams) {
  return useQuery({
    queryKey: ["pulp", "administration", "signingServices", params],
    queryFn: () => listSigningServices(params),
    placeholderData: (previous) => previous,
  });
}
