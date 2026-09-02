import { useQuery } from "@tanstack/react-query";

import { getStatus } from "../api/client/status";

export function useStatusQuery() {
  return useQuery({
    queryKey: ["pulp", "status"],
    queryFn: getStatus,
  });
}
