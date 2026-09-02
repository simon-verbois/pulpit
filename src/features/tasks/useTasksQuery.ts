import { useQuery } from "@tanstack/react-query";

import { listTasks, type ListTasksParams } from "../../api/client/tasks";
import { tasksHistoryQueryKey } from "./queryKeys";

export function useTasksQuery(params: ListTasksParams) {
  return useQuery({
    queryKey: tasksHistoryQueryKey(params),
    queryFn: () => listTasks(params),
  });
}
