import { useQuery } from "@tanstack/react-query";

import {
  listFileContent,
  type ListFileContentParams,
} from "../../../api/client/file/content";

export function useFileContentQuery(params: ListFileContentParams) {
  return useQuery({
    queryKey: ["pulp", "file", "content", params],
    queryFn: () => listFileContent(params),
    placeholderData: (previous) => previous,
  });
}
