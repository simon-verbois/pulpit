import { useQuery } from "@tanstack/react-query";

import {
  getComponentRepositoryCounts,
  contentSizeKeys,
} from "../../api/client/pulpitCore/contentSize";

/** Backend-cached repository count per plugin component (pulpit-core's
 * content_size module refreshes this every 5 minutes - see
 * docs/ARCHITECTURE.md "Derived content sizes and repository counts") -
 * one shared query instead of a live per-plugin request each mount. */
export function useRepositoryCounts() {
  return useQuery({
    queryKey: contentSizeKeys.repositoryCounts,
    queryFn: () => getComponentRepositoryCounts(),
    staleTime: 5 * 60 * 1000,
  });
}
