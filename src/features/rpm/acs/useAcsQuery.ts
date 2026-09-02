import { useQuery } from "@tanstack/react-query";

import {
  listAlternateContentSources,
  type ListAcsParams,
} from "../../../api/client/rpm/acs";
import { acsQueryKey } from "./queryKeys";

export function useAcsQuery(params: ListAcsParams) {
  return useQuery({
    queryKey: acsQueryKey(params),
    queryFn: () => listAlternateContentSources(params),
    placeholderData: (previous) => previous,
  });
}
