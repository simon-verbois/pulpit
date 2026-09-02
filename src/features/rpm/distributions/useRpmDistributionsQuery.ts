import { useQuery } from "@tanstack/react-query";

import {
  listRpmDistributions,
  type ListRpmDistributionsParams,
} from "../../../api/client/rpm/distributions";
import { rpmDistributionsQueryKey } from "./queryKeys";

export function useRpmDistributionsQuery(params: ListRpmDistributionsParams) {
  return useQuery({
    queryKey: rpmDistributionsQueryKey(params),
    queryFn: () => listRpmDistributions(params),
    placeholderData: (previous) => previous,
  });
}
