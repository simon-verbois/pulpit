import { useQuery } from "@tanstack/react-query";

import {
  listRpmDistributions,
  listRpmRepositoryDistributions,
  type ListRpmDistributionsParams,
} from "../../../api/client/rpm/distributions";
import { rpmDistributionsQueryKey } from "./queryKeys";

export function useRpmDistributionsQuery(params: ListRpmDistributionsParams) {
  return useQuery({
    queryKey: rpmDistributionsQueryKey(params),
    queryFn: () =>
      params.repository
        ? listRpmRepositoryDistributions({
            repository: params.repository,
            limit: params.limit,
            offset: params.offset,
          })
        : listRpmDistributions(params),
    placeholderData: (previous) => previous,
  });
}
