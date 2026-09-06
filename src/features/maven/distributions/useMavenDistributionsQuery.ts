import { useQuery } from "@tanstack/react-query";

import {
  listMavenDistributions,
  type ListMavenDistributionsParams,
} from "../../../api/client/maven/distributions";
import { mavenDistributionsQueryKey } from "./queryKeys";

export function useMavenDistributionsQuery(params: ListMavenDistributionsParams) {
  return useQuery({
    queryKey: mavenDistributionsQueryKey(params),
    queryFn: () => listMavenDistributions(params),
    placeholderData: (previous) => previous,
  });
}
