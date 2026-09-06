import { useQuery } from "@tanstack/react-query";

import {
  listHuggingFaceDistributions,
  type ListHuggingFaceDistributionsParams,
} from "../../../api/client/hugging_face/distributions";
import { huggingFaceDistributionsQueryKey } from "./queryKeys";

export function useHuggingFaceDistributionsQuery(
  params: ListHuggingFaceDistributionsParams,
) {
  return useQuery({
    queryKey: huggingFaceDistributionsQueryKey(params),
    queryFn: () => listHuggingFaceDistributions(params),
    placeholderData: (previous) => previous,
  });
}
