import { useQuery } from "@tanstack/react-query";

import {
  listGalaxyNamespaces,
  type ListGalaxyNamespacesParams,
} from "../../../api/client/ansible/galaxyNamespaces";
import { galaxyNamespacesQueryKey } from "./queryKeys";

export function useGalaxyNamespacesQuery(
  distributionBasePath: string,
  params: ListGalaxyNamespacesParams,
) {
  return useQuery({
    queryKey: galaxyNamespacesQueryKey(distributionBasePath, params),
    queryFn: () => listGalaxyNamespaces(distributionBasePath, params),
    enabled: distributionBasePath !== "",
    placeholderData: (previous) => previous,
  });
}
