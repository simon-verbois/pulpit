import { useQuery } from "@tanstack/react-query";

import {
  listGemContent,
  type ListGemContentParams,
} from "../../../api/client/gem/content";

export function useGemContentQuery(params: ListGemContentParams) {
  return useQuery({
    queryKey: ["pulp", "gem", "content", params],
    queryFn: () => listGemContent(params),
    placeholderData: (previous) => previous,
  });
}
