import { useQuery } from "@tanstack/react-query";

import {
  listTasks,
  TASK_POLL_INTERVAL_MS,
  TERMINAL_TASK_STATES,
  type ListTasksParams,
} from "../../api/client/tasks";
import { tasksHistoryQueryKey } from "./queryKeys";

export function useTasksQuery(params: ListTasksParams) {
  return useQuery({
    queryKey: tasksHistoryQueryKey(params),
    queryFn: () => listTasks(params),
    // Keep polling while any listed task is still in flight, so a running
    // sync moves to "completed" (and new rows appear) without a reload.
    refetchInterval: (query) =>
      query.state.data?.results.some((task) => !TERMINAL_TASK_STATES.has(task.state))
        ? TASK_POLL_INTERVAL_MS
        : false,
  });
}
