import { useQuery } from "@tanstack/react-query";

import {
  listMavenContent,
  type ListMavenContentParams,
} from "../../../api/client/maven/content";

export function useMavenContentQuery(params: ListMavenContentParams) {
  return useQuery({
    queryKey: ["pulp", "maven", "content", params],
    queryFn: () => listMavenContent(params),
    placeholderData: (previous) => previous,
  });
}
