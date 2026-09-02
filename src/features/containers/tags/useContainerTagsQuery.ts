import { useQuery } from "@tanstack/react-query";

import {
  listContainerTags,
  type ListContainerTagsParams,
} from "../../../api/client/container/tags";
import { containerTagsQueryKey } from "./queryKeys";

export function useContainerTagsQuery(params: ListContainerTagsParams) {
  return useQuery({
    queryKey: containerTagsQueryKey(params),
    queryFn: () => listContainerTags(params),
    placeholderData: (previous) => previous,
  });
}
