import { useQuery } from "@tanstack/react-query";

import {
  listHuggingFaceRepositories,
  type ListHuggingFaceRepositoriesParams,
} from "../../../api/client/hugging_face/repositories";
import { huggingFaceRepositoriesQueryKey } from "./queryKeys";

export function useHuggingFaceRepositoriesQuery(
  params: ListHuggingFaceRepositoriesParams,
) {
  return useQuery({
    queryKey: huggingFaceRepositoriesQueryKey(params),
    queryFn: () => listHuggingFaceRepositories(params),
    placeholderData: (previous) => previous,
  });
}
