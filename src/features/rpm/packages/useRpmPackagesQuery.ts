import { useQuery } from "@tanstack/react-query";

import {
  listRpmPackages,
  type ListRpmPackagesParams,
} from "../../../api/client/rpm/packages";

export function useRpmPackagesQuery(params: ListRpmPackagesParams) {
  return useQuery({
    queryKey: ["pulp", "rpm", "packages", params],
    queryFn: () => listRpmPackages(params),
    placeholderData: (previous) => previous,
  });
}
