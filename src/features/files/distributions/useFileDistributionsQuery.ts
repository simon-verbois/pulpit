import { useQuery } from "@tanstack/react-query";

import {
  listFileDistributions,
  type ListFileDistributionsParams,
} from "../../../api/client/file/distributions";
import { fileDistributionsQueryKey } from "./queryKeys";

export function useFileDistributionsQuery(params: ListFileDistributionsParams) {
  return useQuery({
    queryKey: fileDistributionsQueryKey(params),
    queryFn: () => listFileDistributions(params),
    placeholderData: (previous) => previous,
  });
}
