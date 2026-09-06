import { useQuery } from "@tanstack/react-query";

import {
  listGemDistributions,
  type ListGemDistributionsParams,
} from "../../../api/client/gem/distributions";
import { gemDistributionsQueryKey } from "./queryKeys";

export function useGemDistributionsQuery(params: ListGemDistributionsParams) {
  return useQuery({
    queryKey: gemDistributionsQueryKey(params),
    queryFn: () => listGemDistributions(params),
    placeholderData: (previous) => previous,
  });
}
