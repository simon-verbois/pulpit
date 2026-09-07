import { useQuery } from "@tanstack/react-query";

import { getHuggingFaceRepositoryByName } from "../../../api/client/hugging_face/repositories";
import { huggingFaceRepositoryByNameKey } from "./queryKeys";

export function useHuggingFaceRepositoryByNameQuery(name: string) {
  return useQuery({
    queryKey: huggingFaceRepositoryByNameKey(name),
    queryFn: () => getHuggingFaceRepositoryByName(name),
    // Sync can be triggered by another session, the Pulp scheduler, or an
    // API caller with nothing in this browser to invalidate this query -
    // poll so a new version from outside this session shows up without F5.
    refetchInterval: 15000,
  });
}
