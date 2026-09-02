import { useQuery } from "@tanstack/react-query";

import {
  listRpmUlnRemotes,
  type ListRpmUlnRemotesParams,
} from "../../../api/client/rpm/ulnRemotes";
import { rpmUlnRemotesQueryKey } from "./queryKeys";

export function useRpmUlnRemotesQuery(params: ListRpmUlnRemotesParams) {
  return useQuery({
    queryKey: rpmUlnRemotesQueryKey(params),
    queryFn: () => listRpmUlnRemotes(params),
    placeholderData: (previous) => previous,
  });
}
