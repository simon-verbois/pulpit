import { useQuery } from "@tanstack/react-query";

import { getGroupByName } from "../../../api/client/access/groups";
import { groupByNameKey } from "./queryKeys";

export function useGroupByNameQuery(name: string) {
  return useQuery({
    queryKey: groupByNameKey(name),
    queryFn: () => getGroupByName(name),
  });
}
