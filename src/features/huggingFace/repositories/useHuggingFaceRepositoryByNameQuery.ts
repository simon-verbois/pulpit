import { useQuery } from "@tanstack/react-query";

import { getHuggingFaceRepositoryByName } from "../../../api/client/hugging_face/repositories";
import { huggingFaceRepositoryByNameKey } from "./queryKeys";

export function useHuggingFaceRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: huggingFaceRepositoryByNameKey(name),
    queryFn: () => getHuggingFaceRepositoryByName(name),
  });
}
