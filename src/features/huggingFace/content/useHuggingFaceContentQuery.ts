import { useQuery } from "@tanstack/react-query";

import {
  listHuggingFaceContent,
  type ListHuggingFaceContentParams,
} from "../../../api/client/hugging_face/content";

export function useHuggingFaceContentQuery(params: ListHuggingFaceContentParams) {
  return useQuery({
    queryKey: ["pulp", "hugging_face", "content", params],
    queryFn: () => listHuggingFaceContent(params),
    placeholderData: (previous) => previous,
  });
}
