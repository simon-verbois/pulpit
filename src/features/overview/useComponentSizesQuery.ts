import { useQuery } from "@tanstack/react-query";

import { getComponentContentSizes, contentSizeKeys } from "../../api/client/contentSizes";

export function useComponentSizesQuery() {
  return useQuery({
    queryKey: contentSizeKeys.components,
    queryFn: ({ signal }) => getComponentContentSizes(signal),
    staleTime: 5 * 60 * 1000,
  });
}
