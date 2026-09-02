import { useQuery } from "@tanstack/react-query";

import { getComponentContentSizes } from "../../api/client/pulpitCore/contentSize";

/** Refreshed hourly by a pulpit-core background job, never computed live
 * (docs/UX.md "per-plugin storage-size breakdown") - this just reads
 * whatever pulpit-core last cached, so a normal query staleness/refetch
 * policy is enough; no polling needed for a value that only changes on an
 * hourly server-side schedule. */
export function useComponentSizesQuery() {
  return useQuery({
    queryKey: ["pulpit-core", "content-size", "sizes"],
    queryFn: getComponentContentSizes,
  });
}
