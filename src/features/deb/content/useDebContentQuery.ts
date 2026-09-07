import { useQuery } from "@tanstack/react-query";

import {
  listDebContent,
  type ListDebContentParams,
} from "../../../api/client/deb/content";

export function useDebContentQuery(params: ListDebContentParams) {
  return useQuery({
    queryKey: ["pulp", "deb", "content", params],
    queryFn: () => listDebContent(params),
    placeholderData: (previous) => previous,
  });
}
