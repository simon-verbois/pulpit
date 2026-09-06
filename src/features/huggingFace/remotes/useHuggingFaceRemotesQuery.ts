import { useQuery } from "@tanstack/react-query";

import {
  listHuggingFaceRemotes,
  type ListHuggingFaceRemotesParams,
} from "../../../api/client/hugging_face/remotes";
import { huggingFaceRemotesQueryKey } from "./queryKeys";

export function useHuggingFaceRemotesQuery(params: ListHuggingFaceRemotesParams) {
  return useQuery({
    queryKey: huggingFaceRemotesQueryKey(params),
    queryFn: () => listHuggingFaceRemotes(params),
    placeholderData: (previous) => previous,
  });
}
