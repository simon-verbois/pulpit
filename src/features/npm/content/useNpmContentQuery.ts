import { useQuery } from "@tanstack/react-query";

import { listNpmContent, type ListNpmContentParams } from "../../../api/client/npm/content";

export function useNpmContentQuery(params: ListNpmContentParams) {
  return useQuery({
    queryKey: ["pulp", "npm", "content", params],
    queryFn: () => listNpmContent(params),
    placeholderData: (previous) => previous,
  });
}
