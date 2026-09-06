import { useQuery } from "@tanstack/react-query";

import {
  listDebDistributions,
  type ListDebDistributionsParams,
} from "../../../api/client/deb/distributions";
import { debDistributionsQueryKey } from "./queryKeys";

export function useDebDistributionsQuery(params: ListDebDistributionsParams) {
  return useQuery({
    queryKey: debDistributionsQueryKey(params),
    queryFn: () => listDebDistributions(params),
    placeholderData: (previous) => previous,
  });
}
