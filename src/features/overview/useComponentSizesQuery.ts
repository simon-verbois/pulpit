import { useQuery } from "@tanstack/react-query";

import { getComponentContentSizes, contentSizeKeys } from "../../api/client/pulpitCore/contentSize";

export function useComponentSizesQuery() {
  return useQuery({
    queryKey: contentSizeKeys.components,
    queryFn: () => getComponentContentSizes(),
    staleTime: 5 * 60 * 1000,
  });
}
