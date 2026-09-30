import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  resolveTaskResources,
  type TaskResourceRef,
} from "../../api/client/taskResources";

/** Resolves the names of every ref in one round-trip per resource kind -
 * the Tasks page passes a whole page of rows at once rather than one query
 * per row. */
export function useTaskResources(refs: TaskResourceRef[]) {
  const keys = [...new Set(refs.map((ref) => ref.key))].sort();
  return useQuery({
    queryKey: ["pulp", "task-resources", keys],
    queryFn: () => resolveTaskResources(refs),
    enabled: keys.length > 0,
    staleTime: 60_000,
    // Keep the previous page's names while the next page's resolve, instead
    // of flashing every resource cell back to its placeholder.
    placeholderData: keepPreviousData,
  });
}
