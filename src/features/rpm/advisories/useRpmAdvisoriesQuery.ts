import { useQuery } from "@tanstack/react-query";

import {
  listRpmAdvisories,
  type ListRpmAdvisoriesParams,
} from "../../../api/client/rpm/advisories";
import { rpmAdvisoriesQueryKey } from "./queryKeys";

export function useRpmAdvisoriesQuery(params: ListRpmAdvisoriesParams) {
  return useQuery({
    queryKey: rpmAdvisoriesQueryKey(params),
    queryFn: () => listRpmAdvisories(params),
    placeholderData: (previous) => previous,
  });
}
