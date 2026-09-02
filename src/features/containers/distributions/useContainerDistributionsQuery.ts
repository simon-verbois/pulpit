import { useQuery } from "@tanstack/react-query";

import {
  listContainerDistributions,
  type ListContainerDistributionsParams,
} from "../../../api/client/container/distributions";
import { containerDistributionsQueryKey } from "./queryKeys";

export function useContainerDistributionsQuery(params: ListContainerDistributionsParams) {
  return useQuery({
    queryKey: containerDistributionsQueryKey(params),
    queryFn: () => listContainerDistributions(params),
    placeholderData: (previous) => previous,
  });
}
