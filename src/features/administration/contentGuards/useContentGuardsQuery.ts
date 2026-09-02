import { useQuery } from "@tanstack/react-query";

import {
  listContentGuards,
  type ListContentGuardsParams,
} from "../../../api/client/administration/contentGuards";
import { contentGuardsQueryKey } from "./queryKeys";

export function useContentGuardsQuery(params: ListContentGuardsParams) {
  return useQuery({
    queryKey: contentGuardsQueryKey(params),
    queryFn: () => listContentGuards(params),
    placeholderData: (previous) => previous,
  });
}
