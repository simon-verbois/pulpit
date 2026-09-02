import { useQuery } from "@tanstack/react-query";

import {
  listRpmRepositories,
  type ListRpmRepositoriesParams,
} from "../../../api/client/rpm/repositories";
import { rpmRepositoriesQueryKey } from "./queryKeys";

export function useRpmRepositoriesQuery(params: ListRpmRepositoriesParams) {
  return useQuery({
    queryKey: rpmRepositoriesQueryKey(params),
    queryFn: () => listRpmRepositories(params),
    placeholderData: (previous) => previous,
  });
}
