import { useQuery } from "@tanstack/react-query";

import {
  listNpmDistributions,
  type ListNpmDistributionsParams,
} from "../../../api/client/npm/distributions";
import { npmDistributionsQueryKey } from "./queryKeys";

export function useNpmDistributionsQuery(params: ListNpmDistributionsParams) {
  return useQuery({
    queryKey: npmDistributionsQueryKey(params),
    queryFn: () => listNpmDistributions(params),
    placeholderData: (previous) => previous,
  });
}
